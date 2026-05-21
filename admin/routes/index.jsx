import React from "react";
import { createRootRoute, createRoute, createRouter, redirect, Outlet } from "@tanstack/react-router";
import { auth } from "../lib/api";
import Layout from "../components/Layout";
import LoginScreen from "../components/LoginScreen";
import IntegrationsPage from "../components/Integrations/IntegrationsPage";
import IntegrationDetailPage from "../components/Integrations/IntegrationDetailPage";
import ScenariosPage from "../components/Scenarios/ScenariosPage";
import ScenarioDetailPage from "../components/Scenarios/ScenarioDetailPage";
import TrafficPage from "../components/Traffic/TrafficPage";
import ErrorBoundary from "../components/ErrorBoundary";

async function requireAuth() {
  try {
    const data = await auth.me();
    if (!data.authenticated) {
      throw redirect({ to: "/login" });
    }
    return data;
  } catch (e) {
    if (e?.routerCode === "ERR_REDIRECT") throw e;
    throw redirect({ to: "/login" });
  }
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginScreen,
  beforeLoad: async () => {
    try {
      const data = await auth.me();
      if (data.authenticated) {
        throw redirect({ to: "/integrations" });
      }
    } catch (e) {
      if (e?.routerCode === "ERR_REDIRECT") throw e;
    }
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/integrations" });
  },
});

// Pathless layout route — uses `id` instead of `path` so it doesn't affect the URL
const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  beforeLoad: requireAuth,
  component: Layout,
});

const integrationsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/integrations",
  component: () => <ErrorBoundary><IntegrationsPage /></ErrorBoundary>,
});

const integrationDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/integrations/$id",
  component: () => <ErrorBoundary><IntegrationDetailPage /></ErrorBoundary>,
});

const scenariosRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/scenarios",
  component: () => <ErrorBoundary><ScenariosPage /></ErrorBoundary>,
});

const scenarioDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/scenarios/$id",
  component: () => <ErrorBoundary><ScenarioDetailPage /></ErrorBoundary>,
});

const trafficRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/traffic",
  component: () => <ErrorBoundary><TrafficPage /></ErrorBoundary>,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  protectedLayoutRoute.addChildren([
    integrationsRoute,
    integrationDetailRoute,
    scenariosRoute,
    scenarioDetailRoute,
    trafficRoute,
  ]),
]);

export const router = createRouter({ routeTree });
