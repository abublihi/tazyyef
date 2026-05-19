const PostmanImportService = require("../services/postmanImportService");
const Scenario = require("../models/Scenario");
const Integration = require("../models/Integration");

class ImportController {
  static async preview(req, res) {
    try {
      const integrationId = req.params.id;
      const integration = await Integration.getById(integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const collection = req.body.collection;
      if (!collection) {
        return res.status(400).json({ error: "No Postman collection data provided" });
      }

      const parsed = PostmanImportService.parseCollection(collection);

      const { conflicts, nonConflicts } = await Scenario.findConflicts(integrationId, parsed.endpoints);

      const previewEndpoints = [
        ...nonConflicts.map((ep) => ({
          ...ep,
          hasConflict: false,
          conflictAction: "create",
        })),
        ...conflicts.map((ep) => ({
          ...ep,
          hasConflict: true,
          conflictAction: "skip",
          existingEndpoint: {
            method: ep.conflict.method,
            endpoint: ep.conflict.endpoint,
            id: ep.conflict.id,
          },
        })),
      ];

      res.json({
        collection: parsed.info,
        endpoints: previewEndpoints,
        totalEndpoints: parsed.totalEndpoints,
        conflictCount: conflicts.length,
        hasEnvVariables: parsed.hasEnvVariables,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async confirm(req, res) {
    try {
      const integrationId = req.params.id;
      const integration = await Integration.getById(integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const { endpoints, collectionName } = req.body;
      if (!endpoints || !Array.isArray(endpoints)) {
        return res.status(400).json({ error: "No endpoints provided for import" });
      }

      const results = {
        imported: [],
        skipped: [],
        failed: [],
        updated: [],
      };

      for (const ep of endpoints) {
        try {
          if (ep.action === "skip") {
            results.skipped.push({ name: ep.name, reason: "Skipped by user" });
            continue;
          }

          const importMetadata = {
            source: "postman",
            collectionName: collectionName || "Unknown",
            importedAt: new Date().toISOString(),
            originalName: ep.name,
            originalFolder: ep.folder,
          };

          if (ep.action === "overwrite" && ep.conflictId) {
            const updated = await Scenario.update(ep.conflictId, {
              endpoint: ep.endpoint,
              method: ep.method,
              headers: ep.headers,
              queryParams: ep.queryParams,
              bodyParams: ep.bodyParams,
              responseCode: ep.responseCode,
              responseBody: ep.responseBody,
              source: "postman",
              importMetadata,
            });
            if (updated) {
              results.updated.push({ id: ep.conflictId, name: ep.name });
            } else {
              results.failed.push({ name: ep.name, reason: "Failed to update existing endpoint" });
            }
            continue;
          }

          const scenarioData = {
            endpoint: ep.endpoint,
            method: ep.method,
            headers: ep.headers,
            queryParams: ep.queryParams,
            bodyParams: ep.bodyParams,
            responseCode: ep.responseCode,
            responseBody: ep.responseBody,
            source: "postman",
            importMetadata,
          };

          const created = await Scenario.create(integrationId, scenarioData);
          results.imported.push({ id: created.id, name: ep.name });
        } catch (err) {
          results.failed.push({ name: ep.name, reason: err.message });
        }
      }

      res.json({
        summary: {
          total: endpoints.length,
          imported: results.imported.length,
          skipped: results.skipped.length,
          failed: results.failed.length,
          updated: results.updated.length,
        },
        details: results,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = ImportController;
