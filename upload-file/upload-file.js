const core = require("@actions/core");
const FormData = require("form-data");
const axios = require("axios");
const fs = require("fs");

//see https://app.swaggerhub.com/apis/matrixreq/MatrixALM_QMS/2.3

async function putItem(
  baseURL,
  token,
  project,
  item,
  reason,
  fieldId,
  fieldValue
) {
  try {
    if (fieldId.indexOf("fx") == -1) {
      core.setFailed("fieldId should start with fx");
      return;
    }

    const formData = new FormData();
    formData.append("reason", reason);
    formData.append(fieldId, JSON.stringify(fieldValue));

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

    core.info(`PUT ${baseURL}/rest/1/${project}/item/${item}`);
    core.info("reason", reason);
    core.info(fieldId, JSON.stringify(fieldValue));

    await instance.put(`${project}/item/${item}`, formData, {
      headers: formData.getHeaders(),
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function uploadFile(baseURL, token, project, file) {
  const formData = new FormData();
  formData.append("file", fs.createReadStream(file));

  const axiosConfig = {
    baseURL: `${baseURL}/rest/1`,
    headers:
      token !== undefined && token !== ""
        ? {
            Authorization: `Token ${token}`,
          }
        : undefined,
  };

  const instance = axios.create(axiosConfig);

  core.info(`Uploading ${file} to ${baseURL}/rest/1/${project}/file`);

  const response = await instance.post(`${project}/file`, formData, {
    headers: formData.getHeaders(),
  });

  const body = response.data;
  if (typeof body === "object") {
    return {
      fileId: body.fileId,
      fileFullPath: body.fileFullPath,
      key: body.key,
    };
  } else {
    throw new Error("Unable to parse file response");
  }
}

async function run() {
  try {
    const url = core.getInput("url");
    const token = core.getInput("token");
    const project = core.getInput("project");
    const file = core.getInput("file");
    const item = core.getInput("item");
    const reason = core.getInput("reason");
    const fieldId = core.getInput("fieldId");
    if (fieldId.indexOf("fx") == -1) {
      core.setFailed("fieldId should start with fx");
      return;
    }
    const fileName = core.getInput("fileName");

    const body = await uploadFile(url, token, project, file);

    const field = [
      {
        fileName: fileName,
        fileId: `${body.fileId}?key=${body.key}`,
      },
    ];

    await putItem(url, token, project, item, reason, fieldId, field);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
