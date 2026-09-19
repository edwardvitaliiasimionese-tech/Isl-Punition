"use strict";

// =========================
// ÉLÉMENTS DE LA PAGE
// =========================

const addStudentBtn = document.getElementById("addStudentBtn");
const addPunishmentBtn = document.getElementById("addPunishmentBtn");

const modal = document.getElementById("modal");
const closeModalBtn = document.getElementById("closeModal");
const modalForm = document.getElementById("modalForm");
const modalTitle = document.getElementById("modalTitle");
const modalEyebrow = document.getElementById("modalEyebrow");

const studentsContainer = document.getElementById("students");
const punishmentsContainer = document.getElementById("punishments");

const searchInput = document.getElementById("search");
const classFilter = document.getElementById("classFilter");
const typeFilter = document.getElementById("typeFilter");
const sortSelect = document.getElementById("sort");

const studentCount = document.getElementById("studentCount");
const punishmentCount = document.getElementById("punishmentCount");
const todayCount = document.getElementById("todayCount");

const pushBtn = document.getElementById("pushBtn");
const toast = document.getElementById("toast");

// =========================
// DONNÉES
// =========================

let students = [];
let punishments = [];

let editingStudentId = null;
let editingPunishmentId = null;

// =========================
// API
// =========================

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Une erreur est survenue.");
  }

  return data;
}

// =========================
// UTILITAIRES
// =========================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function todayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  if (!date) return "—";

  const parts = String(date).split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return date;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("N
