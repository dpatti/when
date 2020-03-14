const defaultState = () =>
  ({
    when: new Date(),
    where: [moment.tz.guess()],
  });

const parseQuery = (search) => {
  const query = {};

  if (search[0] === '?') {
    search
      .slice(1)
      .split('&')
      .map(x => x.split('='))
      .forEach(([k, v]) => { query[k] = v; });
  }

  return Object.assign(
    {},
    defaultState(),
    (query.when ? { when: new Date(query.when) } : {}),
    (query.where ? { where : query.where.split(",") } : {})
  );
};

const serializeQuery = (state) =>
  `?when=${state.when.toISOString()}&where=${state.where.join(",")}`;

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
const reset = document.querySelector("#reset");
const canvas = document.querySelector("#canvas");
const state = {};

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
  where.removeAllTags();
  where.addTags(state.where);

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
where.on("add remove", fromInput);
resetWhen.addEventListener("click", () =>
  fromState(Object.assign({}, state, { when: defaultState().when }), true));
resetWhere.addEventListener("click", () =>
  fromState(Object.assign({}, state, { where: defaultState().where }), true));
window.addEventListener("popstate", (event) => fromState(event.state));

// init
fromState(parseQuery(document.location.search));
