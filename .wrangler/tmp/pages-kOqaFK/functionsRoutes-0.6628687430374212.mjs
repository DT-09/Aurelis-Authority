import { onRequestGet as __api_assessment__token__js_onRequestGet } from "C:\\Users\\HOME\\Documents\\OLYMPUS\\projects\\AurelisAuthority\\functions\\api\\assessment\\[token].js"

export const routes = [
    {
      routePath: "/api/assessment/:token",
      mountPath: "/api/assessment",
      method: "GET",
      middlewares: [],
      modules: [__api_assessment__token__js_onRequestGet],
    },
  ]