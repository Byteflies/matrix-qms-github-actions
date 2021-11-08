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

    core.info(`GET ${baseURL}/rest/1/${project}`);

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

    core.info(`GET ${baseURL}/rest/1/${project}/tree`);

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

    core.info(`GET ${baseURL}/rest/1/${project}/item/${item}`);

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

    const projectInfo = await getProject(url, token, project);
    //console.log("project info", projectInfo);
    const projectTree = await getProjectTree(url, token, project);
    //console.log("project tree", projectTree);

    if (projectTree && Array.isArray(projectTree) && projectInfo) {
      for (const projectLeaf of projectTree) {
        const items = getItemsFromProjectTree(projectLeaf);
        for (const item of items) {
          //console.log("processing item", item);
          await lintItem(url, token, project, item, projectInfo);
        }
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function lintRichText(richText) {
  if (richText === undefined || richText === "") {
    return;
  }

  const parser = new htmlparser2.Parser({
    onopentag(name, attributes) {
      console.log("onopentag", name, attributes);
      // if (name === "script" && attributes.type === "text/javascript") {
      //   console.log("onopentag", name, attributes);
      // }
    },
    ontext(text) {
      /*
       * Fires whenever a section of text was processed.
       *
       * Note that this can fire at any point within text and you might
       * have to stich together multiple pieces.
       */
      console.log("ontext", text);
    },
    onclosetag(tagname) {
      /*
       * Fires when a tag is closed.
       *
       * You can rely on this event only firing when you have received an
       * equivalent opening tag before. Closing tags without corresponding
       * opening tags will be ignored.
       */
      if (tagname === "script") {
        console.log("onclosetag", tagname);
      }
    },
  });
  parser.write(richText);
  parser.end();
}

async function lintItem(url, token, project, item, projectInfo) {
  if (item === undefined || item.itemRef === undefined) {
    console.log("ignoring item", project, item);
    return;
  } else if (item.isFolder === undefined || item.isFolder === 1) {
    console.log("ignoring folder", project, item);
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
      const fieldName = field.fieldName;
      const fieldType = field.fieldType;
      const value = field.value;

      if (
        fieldType === "richtext" &&
        value !== undefined &&
        typeof value === "string"
      ) {
        await lintRichText(value);
      } else {
        console.log(
          "ignoring item field",
          project,
          itemRef,
          fieldName,
          JSON.stringify(field)
        );
      }
    }
  } else {
    console.log(
      "item does not have fields",
      project,
      itemRef,
      JSON.stringify(item)
    );
  }
}

run();
