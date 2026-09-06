import { crmApiHandler } from "../../api/crm-api.mjs";
import { createNodeResponse, netlifyRequestToNode } from "../lib/http-adapter.mjs";

export default async function api(request) {
  const nodeRequest = await netlifyRequestToNode(request, "api");
  const { response, finished } = createNodeResponse();
  await crmApiHandler(nodeRequest, response);
  return finished;
}
