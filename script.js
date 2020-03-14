const zones = moment.tz.names();

const defaultState = () =>
  ({
    when: new Date(),
    where: [moment.tz.guess()],
  });

const unpackState = (base64) => {
  const packed = Uint8Array.from([...atob(base64)].map(c => c.charCodeAt(0)));
  const view = new DataView(packed.buffer);

  const when = new Date(Number(view.getBigUint64(0)));
  const where = [];
  for (let i = 8; i < view.byteLength; i += 2) {
    where.push(zones[view.getUint16(i)]);
  }

  return { when, where };
};

const packState = (state) => {
  const size = 8 + state.where.length * 2;
  const packed = new Uint8Array(size);
  const view = new DataView(packed.buffer);

  view.setBigUint64(0, BigInt(state.when.valueOf()));
  state.where.forEach((tz, i) => {
    view.setUint16((i * 2) + 8, zones.indexOf(tz));
  });

  return btoa(String.fromCharCode(...packed));
};

const parseQuery = (search) =>
  (search[0] === '?')
    ? unpackState(search.slice(1))
    : defaultState();

const serializeQuery = (state) => `?${packState(state)}`;

const when = document.querySelector("#when");
const where =
  new Tagify(document.querySelector("#where"), {
    whitelist: moment.tz.names(),
    duplicates: false,
    enforceWhitelist: true,
    editTags: false,
    dropdown: {
      enabled: 0,
      position: "text",
      closeOnSelect: false,
      highlightFirst: true,
    }
  });
const canvas = document.querySelector("#canvas");
const state = {};

// Because there doesn't seem to be a way to replace the set of tags without
// firing an add event for each tag, we have to build a sort of event silencer
const resetTags = (tags, values) => {
  tags.isInReset = true;
  tags.loadOriginalValues(values);
  tags.isInReset = false;
}

const pushState = () => {
  history.pushState(state, '', serializeQuery(state));
}

const fromInput = () => {
  Object.assign(state, {
    when: new Date(when.value),
    where: where.value.map(tag => tag.value),
  });
  pushState();

  render();
};

const fromState = (newState, shouldPushState) => {
  Object.assign(state, newState);
  if (shouldPushState) pushState()
  when.value = moment(state.when).format(moment.HTML5_FMT.DATETIME_LOCAL);
  resetTags(where, state.where);

  render();
}

const render = () => {
  const format = (m) => m.format("h:mm a (ddd MMM D, YYYY)");
  const compareBy = (m) => m.utcOffset();
  const local = { label: "Local", moment: moment(state.when) };
  const times =
    state.where
    .map(tz => ({ label: tz, moment: moment.tz(state.when, tz) }))
    .sort((a, b) => compareBy(a.moment) - compareBy(b.moment));

  canvas.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Where</th>
          <th>When</th>
        </tr>
      </thead>
      <tbody>
        ${[local, ...times].map((t => `
          <tr>
            <td>${t.label}</td>
            <td>${format(t.moment)}</td>
          </tr>
        `)).join('')}
      </tbody>
     </table>`;
};

// setup
when.addEventListener("change", fromInput);
where.on("add remove", _ => {
  if (!where.isInReset) fromInput();
});
resetWhen.addEventListener("click", () =>
  fromState(Object.assign({}, state, { when: defaultState().when }), true));
resetWhere.addEventListener("click", () =>
  fromState(Object.assign({}, state, { where: defaultState().where }), true));
window.addEventListener("popstate", (event) => fromState(event.state));

// init
fromState(parseQuery(document.location.search));
history.replaceState(state, '');
