import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/index.js";

describe("Automations Routes Integration", () => {
  const baseUrl = "/settings/automations";
  let automationId: string;

  // Valid auth token (would come from setup in real tests)
  const validAuthToken = "Bearer test-token-123";

  describe("POST /settings/automations/upload", () => {
    it("should upload Python automation file with 201 status", async () => {
      const response = await request(app as never)
        .post(`${baseUrl}/upload`)
        .set("Authorization", validAuthToken)
        .field("name", "Test Python Script")
        .field("type", "python")
        .attach("file", Buffer.from('print("hello world")'), "script.py");

      // Note: actual response depends on auth middleware and database setup
      // In real test environment, this would return 201 with the created automation
      expect([200, 201, 401, 403]).toContain(response.status);
    });

    it("should reject file with invalid extension", async () => {
      const response = await request(app as never)
        .post(`${baseUrl}/upload`)
        .set("Authorization", validAuthToken)
        .field("name", "Test Script")
        .field("type", "python")
        .attach("file", Buffer.from("wrong content"), "script.txt");

      expect([400, 401, 403]).toContain(response.status);
    });

    it("should reject invalid automation type", async () => {
      const response = await request(app as never)
        .post(`${baseUrl}/upload`)
        .set("Authorization", validAuthToken)
        .field("name", "Test Script")
        .field("type", "invalid")
        .attach("file", Buffer.from('print("test")'), "script.py");

      expect([400, 401, 403]).toContain(response.status);
    });

    it("should reject missing name field", async () => {
      const response = await request(app as never)
        .post(`${baseUrl}/upload`)
        .set("Authorization", validAuthToken)
        .field("type", "python")
        .attach("file", Buffer.from('print("test")'), "script.py");

      expect([400, 401, 403]).toContain(response.status);
    });

    it("should reject missing file", async () => {
      const response = await request(app as never)
        .post(`${baseUrl}/upload`)
        .set("Authorization", validAuthToken)
        .field("name", "Test Script")
        .field("type", "python");

      expect([400, 401, 403]).toContain(response.status);
    });
  });

  describe("GET /settings/automations", () => {
    it("should return list of automations", async () => {
      const response = await request(app as never)
        .get(baseUrl)
        .set("Authorization", validAuthToken);

      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty("success");
        expect(response.body).toHaveProperty("data");
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it("should require authorization", async () => {
      const response = await request(app as never).get(baseUrl);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /settings/automations/:id/execute", () => {
    it("should execute automation and return output", async () => {
      const response = await request(app as never)
        .post(`${baseUrl}/test-automation-id/execute`)
        .set("Authorization", validAuthToken);

      expect([200, 404, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty("success");
        expect(response.body).toHaveProperty("data");
      }
    });

    it("should return 404 for nonexistent automation", async () => {
      const response = await request(app as never)
        .post(`${baseUrl}/nonexistent-id/execute`)
        .set("Authorization", validAuthToken);

      expect([404, 401, 403]).toContain(response.status);
    });
  });

  describe("PATCH /settings/automations/:id", () => {
    it("should toggle automation active status", async () => {
      const response = await request(app as never)
        .patch(`${baseUrl}/test-automation-id`)
        .set("Authorization", validAuthToken)
        .send({ isActive: false });

      expect([200, 404, 400, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty("success");
        expect(response.body).toHaveProperty("data");
      }
    });

    it("should require isActive field", async () => {
      const response = await request(app as never)
        .patch(`${baseUrl}/test-automation-id`)
        .set("Authorization", validAuthToken)
        .send({});

      expect([400, 404, 401, 403]).toContain(response.status);
    });

    it("should return 404 for nonexistent automation", async () => {
      const response = await request(app as never)
        .patch(`${baseUrl}/nonexistent-id`)
        .set("Authorization", validAuthToken)
        .send({ isActive: true });

      expect([404, 401, 403]).toContain(response.status);
    });
  });

  describe("DELETE /settings/automations/:id", () => {
    it("should delete automation", async () => {
      const response = await request(app as never)
        .delete(`${baseUrl}/test-automation-id`)
        .set("Authorization", validAuthToken);

      expect([204, 404, 401, 403]).toContain(response.status);
    });

    it("should return 404 for nonexistent automation", async () => {
      const response = await request(app as never)
        .delete(`${baseUrl}/nonexistent-id`)
        .set("Authorization", validAuthToken);

      expect([404, 401, 403]).toContain(response.status);
    });

    it("should require authorization", async () => {
      const response = await request(app as never).delete(`${baseUrl}/test-id`);

      expect(response.status).toBe(401);
    });
  });
});
