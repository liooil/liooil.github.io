const catalog = document.querySelector("#project-catalog");
const filters = document.querySelector("#filters");

const accentClasses = ["accent-red", "accent-blue", "accent-green", "accent-yellow"];

const formatDate = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

let projects = [];
let activeLanguage = "all";

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getMonogram(name) {
  const parts = name.split(/[-_]/).filter(Boolean);
  const initials = parts.length > 1
    ? parts.slice(0, 2).map((part) => part[0]).join("")
    : name.slice(0, 2);
  return initials.toUpperCase();
}

function createProjectCard(project, index) {
  const card = createElement("article", `project-card ${accentClasses[index % accentClasses.length]}`);
  const head = createElement("div", "project-card-head");
  const monogram = createElement("span", "project-monogram", getMonogram(project.name));
  const number = createElement("span", "project-number", String(index + 1).padStart(2, "0"));

  head.append(monogram, number);

  const kicker = createElement("p", "project-kicker", `${project.language || "Web"} / GitHub Pages`);
  const title = createElement("h3", "", project.name);
  const description = createElement(
    "p",
    "project-description",
    project.description?.trim() || "暂无项目描述。",
  );
  const updated = createElement(
    "p",
    "project-meta",
    `UPDATED ${formatDate.format(new Date(project.updated_at))}`,
  );

  const actions = createElement("div", "project-actions");
  const liveLink = createElement("a", "project-link primary", "打开项目");
  liveLink.href = project.page_url;
  liveLink.append(createElement("span", "", "↗"));
  liveLink.setAttribute("aria-label", `打开 ${project.name}`);

  const sourceLink = createElement("a", "project-link source", "源码");
  sourceLink.href = project.html_url;
  sourceLink.append(createElement("span", "", "↗"));
  sourceLink.setAttribute("aria-label", `查看 ${project.name} 的 GitHub 仓库`);

  actions.append(liveLink, sourceLink);
  card.append(head, kicker, title, description, updated, actions);
  return card;
}

function renderProjects() {
  const visibleProjects = activeLanguage === "all"
    ? projects
    : projects.filter((project) => project.language === activeLanguage);

  catalog.replaceChildren();

  if (!visibleProjects.length) {
    catalog.append(createElement("p", "error-state", "这个筛选条件下暂时没有项目。"));
    return;
  }

  const fragment = document.createDocumentFragment();
  visibleProjects.forEach((project, index) => {
    fragment.append(createProjectCard(project, index));
  });
  catalog.append(fragment);
}

function renderFilters() {
  const counts = projects.reduce((result, project) => {
    const language = project.language || "Web";
    result.set(language, (result.get(language) || 0) + 1);
    return result;
  }, new Map());

  const options = [
    ["all", `全部 ${projects.length}`],
    ...[...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([language, count]) => [language, `${language} ${count}`]),
  ];

  filters.replaceChildren();
  options.forEach(([value, label]) => {
    const button = createElement("button", `filter${value === activeLanguage ? " active" : ""}`, label);
    button.type = "button";
    button.dataset.language = value;
    button.setAttribute("aria-pressed", String(value === activeLanguage));
    filters.append(button);
  });
}

function updateSummary(generatedAt) {
  const languages = new Set(projects.map((project) => project.language || "Web"));
  const latestUpdate = projects.reduce((latest, project) => {
    const date = new Date(project.updated_at);
    return date > latest ? date : latest;
  }, new Date(0));

  document.querySelector("#project-count").textContent = String(projects.length).padStart(2, "0");
  document.querySelector("#language-count").textContent = String(languages.size).padStart(2, "0");
  document.querySelector("#latest-year").textContent = latestUpdate.getFullYear();
  document.querySelector("#catalog-updated").textContent = `目录更新于 ${formatDate.format(new Date(generatedAt))}`;
}

function showLoadError() {
  catalog.replaceChildren();
  const error = createElement("p", "error-state", "项目目录读取失败，请刷新页面后重试。 ");
  const link = createElement("a", "", "前往 GitHub ↗");
  link.href = "https://github.com/liooil";
  error.append(link);
  catalog.append(error);
  document.querySelector("#catalog-updated").textContent = "项目目录暂时不可用";
}

async function loadProjects() {
  try {
    const response = await fetch("./projects.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data.projects)) throw new Error("Invalid project data");

    projects = data.projects;
    updateSummary(data.generated_at);
    renderFilters();
    renderProjects();
  } catch (error) {
    console.error("Unable to load project catalog", error);
    showLoadError();
  } finally {
    catalog.setAttribute("aria-busy", "false");
  }
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-language]");
  if (!button) return;

  activeLanguage = button.dataset.language;
  renderFilters();
  renderProjects();
});

document.querySelector("#year").textContent = new Date().getFullYear();
loadProjects();
