const zones = moment.tz.names();
const localZone = moment.tz.guess();

const defaultState = () =>
  ({
    when: new Date(),
    where: [localZone],
  });

const unpackState = (base64) => {
  const packed = Uint8Array.from([...atob(base64)].map(c => c.charCodeAt(0)));
  const view = new DataView(packed.buffer);

  const version = view.getUint8(0);
  // version tag with backwards-compatible loading
  let pos = (version == 1) ? 1 : 0;
  const when = new Date(view.getFloat64(pos));
  pos += 8;
  const where = [];
  for (; pos < view.byteLength; pos += 2) {
    where.push(zones[view.getUint16(pos)]);
  }

  return { when, where };
};

const packState = (state) => {
  const size = 1 + 8 + state.where.length * 2;
  const packed = new Uint8Array(size);
  const view = new DataView(packed.buffer);

  const version = 1;
  view.setUint8(0, version);
  view.setFloat64(1, state.when.valueOf());
  state.where.forEach((tz, i) => {
    view.setUint16((i * 2) + 1 + 8, zones.indexOf(tz));
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
const deets = document.querySelector("#deets");
const state = {};

// Because there doesn't seem to be a way to replace the set of tags without
// firing an add event for each tag, we have to build a sort of event silencer
const resetTags = (tags, values) => {
  tags.isInReset = true;
  tags.loadOriginalValues(values);
  tags.isInReset = false;
}

const updateHistory = (f) => {
  history[f](state, '', serializeQuery(state));
}

const fromInput = () => {
  Object.assign(state, {
    when: new Date(when.value),
    where: where.value.map(tag => tag.value),
  });
  updateHistory('pushState');

  render();
};

const fromState = (newState, withHistoryUpdate) => {
  Object.assign(state, newState);
  if (withHistoryUpdate) updateHistory(withHistoryUpdate);
  when.value = moment(state.when).format(moment.HTML5_FMT.DATETIME_LOCAL);
  resetTags(where, state.where);

  render();
}

const render = () => {
  const format = (m) => m.format("LT (ddd MMM D, YYYY)");
  const compareBy = (m) => m.utcOffset();
  const times =
    state.where
    .map(tz => ({ where: tz, moment: moment.tz(state.when, tz) }))
    .sort((a, b) => compareBy(a.moment) - compareBy(b.moment));

  deets.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Where</th>
          <th>When</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Everywhere</td>
          <td>${moment().to(state.when)}</td>
        </tr>
        ${times.map((t => `
          <tr${t.where === localZone ? " class='local'" : " class='remote'"}>
            <td>${t.where}</td>
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
  fromState(Object.assign({}, state, { when: defaultState().when }), 'pushState'));
resetWhere.addEventListener("click", () =>
  fromState(Object.assign({}, state, { where: defaultState().where }), 'pushState'));
window.addEventListener("popstate", (event) => fromState(event.state));

// init
fromState(parseQuery(document.location.search), 'replaceState');
