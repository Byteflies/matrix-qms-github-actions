const core = require("@actions/core");
const FormData = require("form-data");
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

    await instance.get(`${project}`);
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

    await instance.get(`${project}/tree`);
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

    await instance.get(`${project}/item/${item}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function run() {
  try {
    const url = core.getInput("url");
    const token = core.getInput("token");
    const project = core.getInput("project");

    const projectInfo = await getProject(url, token, project, file);
    console.log(projectInfo);
    const projectTree = await getProjectTree(url, token, project, file);
    console.log(projectTree);

    if (projectTree && Array.isArray(projectTree) && projectInfo) {
      for (const projectLeaf of projectTree) {
        await lintItem(url, token, project, projectLeaf, projectInfo);
      }
    }

    // const categoryList = project.categoryList;
    // const categorySettingList = project.categorySettingList;
    // if (categoryList && categorySettingList) {
    //   const categoryExtended = categoryList.categoryExtended;

    //   for (const category of categoryExtended) {
    //   }
    // }
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function lintRichText(richText) {
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
  const id = item.id;
  const title = item.title;
  const type = item.type;

  console.log(id, title, type);

  const item = await getProjectItem(url, token, project, id);
  console.log(item);
  if (
    item.fieldValList &&
    item.fieldValList.fieldVal &&
    Array.isArray(item.fieldValList.fieldVal)
  ) {
    for (const field of item.fieldValList.fieldVal) {
      const fieldName = field.fieldName;
      const fieldType = field.fieldType;
      const value = field.value;
      const id = field.id;

      if (
        value &&
        typeof value === "string" &&
        value.indexOf("richtext") !== -1
      ) {
        const v = JSON.parse(value);
        if (v) {
          const t = v.type;
          const name = v.name;
          const fieldValue = v.fieldValue;
          if (
            typeof fieldValue === "string" &&
            fieldValue.indexOf("<") !== -1
          ) {
            await lintRichText(fieldValue);
          }
        }
      }
    }
  }

  const children = item.children;
  if (children && Array.isArray(children)) {
    for (const child of children) {
      await lintItem(url, token, project, child, projectInfo);
    }
  }
}

run();
