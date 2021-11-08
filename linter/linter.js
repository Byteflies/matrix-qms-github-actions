const core = require("@actions/core");
const axios = require("axios");
const htmlparser2 = require("htmlparser2");

// see https://app.swaggerhub.com/apis/matrixreq/MatrixALM_QMS/2.3#/default/get__project_
async function getProject(baseURL, token, project) {
  try {
    const axiosConfig = {
      baseURL: `${baseURL}/rest/1`,
      params: {
        onlyThoseFields: 1,
      },
      headers:
        token !== undefined && token !== ""
          ? {
              Authorization: `Token ${token}`,
            }
          : undefined,
    };

    const instance = axios.create(axiosConfig);

    core.debug(`GET ${baseURL}/rest/1/${project}`);

    const resp = await instance.get(`${project}`);
    return resp.data;
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getProjectTree(baseURL, token, project) {
  try {
    const axiosConfig = {
      baseURL: `${baseURL}/rest/1`,
      params: {
        onlyThoseFields: 1,
      },
      headers:
        token !== undefined && token !== ""
          ? {
              Authorization: `Token ${token}`,
            }
          : undefined,
    };

    const instance = axios.create(axiosConfig);

    core.debug(`GET ${baseURL}/rest/1/${project}/tree`);

    const resp = await instance.get(`${project}/tree`);
    return resp.data;
  } catch (error) {
    core.setFailed(error.message);
  }
}

// see https://app.swaggerhub.com/apis/matrixreq/MatrixALM_QMS/2.3#/default/get__project__item__item_
async function getProjectItem(baseURL, token, project, item) {
  try {
    const axiosConfig = {
      baseURL: `${baseURL}/rest/1`,
      params: {
        onlyThoseFields: 1,
      },
      headers:
        token !== undefined && token !== ""
          ? {
              Authorization: `Token ${token}`,
            }
          : undefined,
    };

    const instance = axios.create(axiosConfig);

    core.debug(`GET ${baseURL}/rest/1/${project}/item/${item}`);

    const resp = await instance.get(`${project}/item/${item}`);
    return resp.data;
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getItemsFromProjectTree(item) {
  const result = [];

  if (item.itemRef !== undefined && item.title !== undefined) {
    result.push(item);
  }

  if (item.folder !== undefined) {
    const children = getItemsFromProjectTree(item.folder);
    for (const c of children) {
      result.push(c);
    }
  }

  if (item.itemList && Array.isArray(item.itemList)) {
    for (const l of item.itemList) {
      const children = getItemsFromProjectTree(l);
      for (const c of children) {
        result.push(c);
      }
    }
  }

  return result;
}

async function run() {
  try {
    const url = core.getInput("url");
    const token = core.getInput("token");
    const project = core.getInput("project");

    //const projectInfo = await getProject(url, token, project);
    const projectTree = await getProjectTree(url, token, project);

    if (projectTree && Array.isArray(projectTree)) {
      for (const projectLeaf of projectTree) {
        const items = getItemsFromProjectTree(projectLeaf);
        for (const item of items) {
          await lintItem(url, token, project, item, projectTree);
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

function validateItem(project, item, itemRef, projectTree) {
  const itemRefs =
    Array.isArray(projectTree) &&
    projectTree
      .map((projectLeaf) => getItemsFromProjectTree(projectLeaf))
      .flat()
      .map((item) => item.itemRef)
      .filter((itemRef) => typeof itemRef === "string")
      .map((itemRef) => itemRef + "");

  if (!itemRefs.includes(itemRef)) {
    core.setFailed(
      `Internal item ref not found: ${project} ${item}: ${itemRef}`
    );
  } else {
    core.info(`${project} ${item}: ${itemRef} checked`);
  }
}

async function validateUrl(project, item, url) {
  const baseURL = core.getInput("url");
  const token = core.getInput("token");

  try {
    const axiosConfig = {
      headers:
        // When this is an internal link, attach the matrix token
        token !== undefined && token !== "" && url.indexOf(baseURL) !== -1
          ? {
              Authorization: `Token ${token}`,
            }
          : undefined,
      validateStatus: function (status) {
        return status === 200 || status === 404;
      },
    };

    const instance = axios.create(axiosConfig);
    core.info(url);
    const resp = await instance.get(url);
    return resp.data;
  } catch (error) {
    core.setFailed(`Invalid url: ${project} ${item} ${url}: ${error.message}`);
  }
}

async function lintRichText(project, item, richText, projectTree) {
  if (richText === undefined || richText === "") {
    return;
  }

  const images = [];
  const anchors = [];
  const itemRefs = [];

  const parser = new htmlparser2.Parser({
    onopentag(name, attributes) {
      if (name === "img") {
        images.push(attributes);
      } else if (name === "a") {
        anchors.push(attributes);
      }
    },
    ontext(text) {
      const regex = /(DOC|VER|SIGN|REQ|RISK|SPEC|VER|VAL|XTC)-([0-9]+)/g;
      var matches = [];
      while ((matches = regex.exec(text)) !== null) {
        const matchTrimmed = matches[0].trim();
        if (matchTrimmed.length > 0) {
          itemRefs.push(matchTrimmed);
        }
      }
    },
    onclosetag(tagname) {},
  });
  parser.write(richText);
  parser.end();

  for (const image of images) {
    if (image.src !== undefined && typeof image.src === "string") {
      await validateUrl(project, item, image.src);
    }
  }

  for (const anchor of anchors) {
    if (anchor.href !== undefined && typeof anchor.href === "string") {
      await validateUrl(project, item, anchor.href);
    }
  }

  for (const itemRef of itemRefs) {
    validateItem(project, item, itemRef, projectTree);
  }
}

async function lintItem(url, token, project, item, projectTree) {
  if (item === undefined || item.itemRef === undefined) {
    return;
  }

  const itemRef = item.itemRef;

  const projectItem = await getProjectItem(url, token, project, itemRef);
  if (
    projectItem.fieldValList !== undefined &&
    projectItem.fieldValList.fieldVal !== undefined &&
    Array.isArray(projectItem.fieldValList.fieldVal)
  ) {
    for (const field of projectItem.fieldValList.fieldVal) {
      await lintField(project, itemRef, field, projectTree);
    }
  }
}

async function lintField(project, itemRef, field, projectTree) {
  const fieldType = field.fieldType;
  const value = field.value;

  if (fieldType === "dhf" && value !== undefined && typeof value === "string") {
    const j = JSON.parse(value);
    if (
      j.type === "richtext" &&
      j.fieldValue !== undefined &&
      typeof j.fieldValue === "string"
    ) {
      await lintRichText(project, itemRef, j.fieldValue, projectTree);
    }
  } else if (
    fieldType === "richtext" &&
    value !== undefined &&
    typeof value === "string"
  ) {
    await lintRichText(project, itemRef, value, projectTree);
  }
}

run();
