/**
 * Seed sample lecture content + RAG index for the first course in DB.
 *
 * Usage (from backend/):
 *   node scripts/seed-tutor-demo.js
 *
 * Requires: MONGO_URI in .env, Ollama running, nomic-embed-text pulled.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { CourseLecture } from "../models/courseLecture.model.js";
import { loadTutorConfig } from "../ai-tutor/config.js";
import { indexCourseLectures } from "../ai-tutor/services/indexing.service.js";

dotenv.config();

const DEMO_LECTURES = [
  {
    order: 1,
    title: "Lecture 1 — Introduction to Kubernetes",
    durationMinutes: 18,
    content: `Kubernetes (K8s) orchestrates containers across a cluster of machines.
A Pod is the smallest deployable unit — one or more containers that share storage and network.
Pods are ephemeral; Deployments keep a desired number of Pod replicas running.
Services expose Pods with stable DNS names and load balancing.
Namespaces isolate resources for teams or environments.`,
  },
  {
    order: 2,
    title: "Lecture 2 — Pods and ReplicaSets",
    durationMinutes: 22,
    content: `A Pod spec lists containers, images, ports, env vars, and volume mounts.
ReplicaSet ensures N identical Pods match a label selector.
If a Pod crashes, the controller replaces it.
Labels and selectors connect Deployments, Services, and Pods.
kubectl get pods -n default shows running Pods in the default namespace.`,
  },
  {
    order: 3,
    title: "Lecture 3 — Deployments and Services",
    durationMinutes: 25,
    content: `Deployment manages rolling updates and rollbacks for stateless apps.
kubectl apply -f deployment.yaml creates or updates resources declaratively.
ClusterIP Service routes traffic inside the cluster; NodePort/LoadBalancer expose externally.
Readiness probes delay traffic until the app is ready; liveness probes restart unhealthy containers.
Practice: explain the difference between a Pod, ReplicaSet, and Deployment in your own words.`,
  },
  {
    order: 4,
    title: "Lecture 4 — MERN stack recap",
    durationMinutes: 30,
    content: `MERN = MongoDB, Express, React, Node.js.
Express handles REST routes and middleware; Mongoose models map to MongoDB collections.
React components fetch data with axios/fetch; JWT in Authorization header authenticates users.
Environment variables keep secrets (JWT, API keys) off the client.
For this platform: courses are catalog items; AI tutor uses RAG over lecture transcripts stored in MongoDB.`,
  },
];

async function main() {
  const config = loadTutorConfig({ TUTOR_ENABLED: "true" });

  await mongoose.connect(process.env.MONGO_URI);
  const course = await Course.findOne().sort({ _id: -1 });
  if (!course) {
    console.error("No courses in database. Create a course in admin first.");
    process.exit(1);
  }

  console.log(`Seeding tutor lectures for: ${course.title} (${course._id})`);

  const existing = await CourseLecture.countDocuments({ courseId: course._id });
  if (existing === 0) {
    for (const lec of DEMO_LECTURES) {
      await CourseLecture.create({ courseId: course._id, ...lec });
    }
    console.log(`Created ${DEMO_LECTURES.length} demo lectures.`);
  } else {
    console.log(`Skipping lecture insert (${existing} lectures already exist).`);
  }

  console.log("Indexing embeddings via Ollama (this may take a minute)...");
  const result = await indexCourseLectures(course._id, config);
  console.log("Done:", result);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
