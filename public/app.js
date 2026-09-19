"use strict";

// =====================================================
// PUNITIONS ISL — APP.JS
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  // ===================================================
  // ÉLÉMENTS
  // ===================================================

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

  // ===================================================
  // DONNÉES
  // ===================================================

  let students = [];
  let punishments = [];

  let editingStudentId = null;
  let editingPunishmentId = null;

  // ===================================================
  // API
  // ===================================================

  async function api(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });

      let data = {};

      try {
        data = await response.json();
      } catch (_) {}

      if (!response.ok) {
        throw new Error(
          data.error || `Erreur HTTP ${response.status}`
        );
      }

      return data;

    } catch (error) {
      console.error("API :", error);
      throw error;
    }
  }

  // ===================================================
  // UTILITAIRES
  // ===================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function todayString() {
    const date = new Date();

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  function formatDate(date) {
    if (!date) return "—";

    const parts = String(date).split("-");

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return String(date);
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function showToast(message) {
    if (!toast) {
      alert(message);
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // ===================================================
  // MODAL
  // ===================================================

  function openModal() {
    if (!modal) return;

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");

    editingStudentId = null;
    editingPunishmentId = null;

    if (modalForm) {
      modalForm.innerHTML = "";
    }
  }

  closeModalBtn?.addEventListener("click", closeModal);

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  // ===================================================
  // AJOUT / MODIFICATION ÉLÈVE
  // ===================================================

  function openStudentForm(student = null) {
    editingStudentId = student ? student.id : null;
    editingPunishmentId = null;

    if (modalEyebrow) {
      modalEyebrow.textContent = student ? "MODIFICATION" : "AJOUT";
    }

    if (modalTitle) {
      modalTitle.textContent = student
        ? "Modifier l'élève"
        : "Nouvel élève";
    }

    if (!modalForm) return;

    modalForm.innerHTML = `
      <div class="form-group">
        <label for="studentNom">Nom</label>
        <input
          id="studentNom"
          name="nom"
          type="text"
          value="${escapeHtml(student?.nom || "")}"
          required
          autocomplete="off"
        >
      </div>

      <div class="form-group">
        <label for="studentPrenom">Prénom</label>
        <input
          id="studentPrenom"
          name="prenom"
          type="text"
          value="${escapeHtml(student?.prenom || "")}"
          required
          autocomplete="off"
        >
      </div>

      <div class="form-group">
        <label for="studentClasse">Classe</label>
        <input
          id="studentClasse"
          name="classe"
          type="text"
          value="${escapeHtml(student?.classe || "")}"
          placeholder="Ex. 3A"
          required
          autocomplete="off"
        >
      </div>

      <button type="submit" class="primary">
        ${student ? "Enregistrer" : "Ajouter l'élève"}
      </button>
    `;

    modalForm.onsubmit = handleStudentSubmit;

    openModal();

    setTimeout(() => {
      document.getElementById("studentNom")?.focus();
    }, 50);
  }

  async function handleStudentSubmit(event) {
    event.preventDefault();

    const nom = document.getElementById("studentNom")?.value.trim();
    const prenom = document.getElementById("studentPrenom")?.value.trim();
    const classe = document.getElementById("studentClasse")?.value.trim();

    if (!nom || !prenom || !classe) {
      showToast("Remplis tous les champs.");
      return;
    }

    try {
      if (editingStudentId) {
        await api(`/api/students/${editingStudentId}`, {
          method: "PUT",
          body: JSON.stringify({
            nom,
            prenom,
            classe
          })
        });

        showToast("Élève modifié.");
      } else {
        await api("/api/students", {
          method: "POST",
          body: JSON.stringify({
            nom,
            prenom,
            classe
          })
        });

        showToast("Élève ajouté.");
      }

      closeModal();
      await loadData();

    } catch (error) {
      showToast(error.message);
    }
  }

  // ===================================================
  // AJOUT / MODIFICATION PUNITION
  // ===================================================

  function openPunishmentForm(punishment = null) {
    if (students.length === 0) {
      showToast("Ajoute d'abord un élève.");
      return;
    }

    editingPunishmentId = punishment ? punishment.id : null;
    editingStudentId = null;

    if (modalEyebrow) {
      modalEyebrow.textContent = punishment
        ? "MODIFICATION"
        : "AJOUT";
    }

    if (modalTitle) {
      modalTitle.textContent = punishment
        ? "Modifier la punition"
        : "Nouvelle punition";
    }

    const selectedStudent = punishment?.student_id
      ? String(punishment.student_id)
      : "";

    const studentsOptions = students
      .slice()
      .sort((a, b) => {
        const aa = `${a.nom} ${a.prenom}`;
        const bb = `${b.nom} ${b.prenom}`;
        return normalize(aa).localeCompare(normalize(bb));
      })
      .map(student => `
        <option
          value="${student.id}"
          ${String(student.id) === selectedStudent ? "selected" : ""}
        >
          ${escapeHtml(student.nom)} ${escapeHtml(student.prenom)}
          — ${escapeHtml(student.classe)}
        </option>
      `)
      .join("");

    if (!modalForm) return;

    modalForm.innerHTML = `
      <div class="form-group">
        <label for="punishmentStudent">Élève</label>
        <select id="punishmentStudent" required>
          <option value="">Choisir un élève</option>
          ${studentsOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="punishmentType">Type</label>
        <select id="punishmentType" required>
          <option value="">Choisir un type</option>
          <option value="Retenue" ${punishment?.type === "Retenue" ? "selected" : ""}>
            Retenue
          </option>
          <option value="Avertissement" ${punishment?.type === "Avertissement" ? "selected" : ""}>
            Avertissement
          </option>
          <option value="Exclusion" ${punishment?.type === "Exclusion" ? "selected" : ""}>
            Exclusion
          </option>
          <option value="Autre" ${punishment?.type === "Autre" ? "selected" : ""}>
            Autre
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="punishmentMotif">Motif</label>
        <textarea
          id="punishmentMotif"
          required
          rows="4"
          placeholder="Motif de la punition..."
        >${escapeHtml(punishment?.motif || "")}</textarea>
      </div>

      <div class="form-group">
        <label for="punishmentDate">Date</label>
        <input
          id="punishmentDate"
          type="date"
          value="${escapeHtml(punishment?.date || todayString())}"
          required
        >
      </div>

      <div class="form-group">
        <label for="punishmentDuree">Durée</label>
        <input
          id="punishmentDuree"
          type="text"
          value="${escapeHtml(punishment?.duree || "")}"
          placeholder="Ex. 1 heure"
        >
      </div>

      <button type="submit" class="primary">
        ${punishment ? "Enregistrer" : "Ajouter la punition"}
      </button>
    `;

    modalForm.onsubmit = handlePunishmentSubmit;

    openModal();
  }

  async function handlePunishmentSubmit(event) {
    event.preventDefault();

    const student_id = Number(
      document.getElementById("punishmentStudent")?.value
    );

    const type =
      document.getElementById("punishmentType")?.value.trim();

    const motif =
      document.getElementById("punishmentMotif")?.value.trim();

    const date =
      document.getElementById("punishmentDate")?.value;

    const duree =
      document.getElementById("punishmentDuree")?.value.trim();

    if (!student_id || !type || !motif || !date) {
      showToast("Remplis tous les champs obligatoires.");
      return;
    }

    const data = {
      student_id,
      type,
      motif,
      date,
      duree
    };

    try {
      if (editingPunishmentId) {
        await api(`/api/punishments/${editingPunishmentId}`, {
          method: "PUT",
          body: JSON.stringify(data)
        });

        showToast("Punition modifiée.");
      } else {
        await api("/api/punishments", {
          method: "POST",
          body: JSON.stringify(data)
        });

        showToast("Punition ajoutée.");
      }

      closeModal();
      await loadData();

    } catch (error) {
      showToast(error.message);
    }
  }

  // ===================================================
  // SUPPRESSION
  // ===================================================

  async function deleteStudent(id) {
    const student = students.find(
      student => Number(student.id) === Number(id)
    );

    if (!student) return;

    const confirmed = confirm(
      `Supprimer ${student.prenom} ${student.nom} ?\n\nSes punitions seront également supprimées.`
    );

    if (!confirmed) return;

    try {
      await api(`/api/students/${id}`, {
        method: "DELETE"
      });

      showToast("Élève supprimé.");
      await loadData();

    } catch (error) {
      showToast(error.message);
    }
  }

  async function deletePunishment(id) {
    const confirmed = confirm(
      "Supprimer cette punition ?"
    );

    if (!confirmed) return;

    try {
      await api(`/api/punishments/${id}`, {
        method: "DELETE"
      });

      showToast("Punition supprimée.");
      await loadData();

    } catch (error) {
      showToast(error.message);
    }
  }

  // ===================================================
  // AFFICHAGE DES ÉLÈVES
  // ===================================================

  function renderStudents() {
    if (!studentsContainer) return;

    const search = normalize(searchInput?.value || "");
    const selectedClass = classFilter?.value || "";

    let filtered = students.filter(student => {
      const text = normalize(
        `${student.nom} ${student.prenom} ${student.classe}`
      );

      const matchesSearch =
        !search || text.includes(search);

      const matchesClass =
        !selectedClass ||
        student.classe === selectedClass;

      return matchesSearch && matchesClass;
    });

    if (filtered.length === 0) {
      studentsContainer.innerHTML = `
        <div class="empty">
          Aucun élève trouvé.
        </div>
      `;
      return;
    }

    studentsContainer.innerHTML = filtered
      .map(student => `
        <div class="student-card">
          <div class="student-info">
            <h3>
              ${escapeHtml(student.prenom)}
              ${escapeHtml(student.nom)}
            </h3>

            <p>
              Classe :
              <strong>${escapeHtml(student.classe)}</strong>
            </p>

            <p>
              Punitions :
              <strong>${Number(student.punishment_count || 0)}</strong>
            </p>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="secondary edit-student"
              data-id="${student.id}"
            >
              Modifier
            </button>

            <button
              type="button"
              class="danger delete-student"
              data-id="${student.id}"
            >
              Supprimer
            </button>
          </div>
        </div>
      `)
      .join("");

    studentsContainer
      .querySelectorAll(".edit-student")
      .forEach(button => {
        button.addEventListener("click", () => {
          const student = students.find(
            s => Number(s.id) === Number(button.dataset.id)
          );

          if (student) {
            openStudentForm(student);
          }
        });
      });

    studentsContainer
      .querySelectorAll(".delete-student")
      .forEach(button => {
        button.addEventListener("click", () => {
          deleteStudent(button.dataset.id);
        });
      });
  }

  // ===================================================
  // AFFICHAGE DES PUNITIONS
  // ===================================================

  function renderPunishments() {
    if (!punishmentsContainer) return;

    const search = normalize(searchInput?.value || "");
    const selectedClass = classFilter?.value || "";
    const selectedType = typeFilter?.value || "";
    const sort = sortSelect?.value || "date-desc";

    let filtered = punishments.filter(punishment => {

      const text = normalize(
        `${punishment.nom} ${punishment.prenom} ${punishment.classe} ${punishment.type} ${punishment.motif}`
      );

      const matchesSearch =
        !search || text.includes(search);

      const matchesClass =
        !selectedClass ||
        punishment.classe === selectedClass;

      const matchesType =
        !selectedType ||
        punishment.type === selectedType;

      return (
        matchesSearch &&
        matchesClass &&
        matchesType
      );
    });

    filtered.sort((a, b) => {

      if (sort === "date-asc") {
        return String(a.date).localeCompare(String(b.date));
      }

      if (sort === "name-asc") {
        return normalize(
          `${a.nom} ${a.prenom}`
        ).localeCompare(
          normalize(`${b.nom} ${b.prenom}`)
        );
      }

      if (sort === "type") {
        return normalize(a.type).localeCompare(
          normalize(b.type)
        );
      }

      return (
        String(b.date).localeCompare(String(a.date)) ||
        Number(b.id) - Number(a.id)
      );
    });

    if (filtered.length === 0) {
      punishmentsContainer.innerHTML = `
        <div class="empty">
          Aucune punition trouvée.
        </div>
      `;
      return;
    }

    punishmentsContainer.innerHTML = filtered
      .map(punishment => `
        <div class="punishment-card">

          <div class="punishment-main">

            <div class="punishment-top">
              <strong>
                ${escapeHtml(punishment.prenom)}
                ${escapeHtml(punishment.nom)}
              </strong>

              <span class="badge">
                ${escapeHtml(punishment.type)}
              </span>
            </div>

            <p class="punishment-class">
              ${escapeHtml(punishment.classe)}
            </p>

            <p class="punishment-motif">
              ${escapeHtml(punishment.motif)}
            </p>

            <div class="punishment-meta">
              <span>
                📅 ${formatDate(punishment.date)}
              </span>

              ${
                punishment.duree
                  ? `<span>⏱️ ${escapeHtml(punishment.duree)}</span>`
                  : ""
              }
            </div>

          </div>

          <div class="card-actions">

            <button
              type="button"
              class="secondary edit-punishment"
              data-id="${punishment.id}"
            >
              Modifier
            </button>

            <button
              type="button"
              class="danger delete-punishment"
              data-id="${punishment.id}"
            >
              Supprimer
            </button>

          </div>

        </div>
      `)
      .join("");

    punishmentsContainer
      .querySelectorAll(".edit-punishment")
      .forEach(button => {
        button.addEventListener("click", () => {

          const punishment = punishments.find(
            p => Number(p.id) === Number(button.dataset.id)
          );

          if (punishment) {
            openPunishmentForm(punishment);
          }
        });
      });

    punishmentsContainer
      .querySelectorAll(".delete-punishment")
      .forEach(button => {
        button.addEventListener("click", () => {
          deletePunishment(button.dataset.id);
        });
      });
  }

  // ===================================================
  // FILTRES
  // ===================================================

  function updateFilters() {

    if (classFilter) {
      const current = classFilter.value;

      const classes = [
        ...new Set(
          students
            .map(student => student.classe)
            .filter(Boolean)
        )
      ].sort((a, b) =>
        normalize(a).localeCompare(normalize(b))
      );

      classFilter.innerHTML = `
        <option value="">Toutes les classes</option>
        ${classes
          .map(classe => `
            <option value="${escapeHtml(classe)}">
              ${escapeHtml(classe)}
            </option>
          `)
          .join("")}
      `;

      if (classes.includes(current)) {
        classFilter.value = current;
      }
    }

    if (typeFilter) {
      const current = typeFilter.value;

      const types = [
        ...new Set(
          punishments
            .map(punishment => punishment.type)
            .filter(Boolean)
        )
      ].sort((a, b) =>
        normalize(a).localeCompare(normalize(b))
      );

      typeFilter.innerHTML = `
        <option value="">Tous les types</option>
        ${types
          .map(type => `
            <option value="${escapeHtml(type)}">
              ${escapeHtml(type)}
            </option>
          `)
          .join("")}
      `;

      if (types.includes(current)) {
        typeFilter.value = current;
      }
    }
  }

  function render() {
    updateFilters();
    renderStudents();
    renderPunishments();
    updateStats();
  }

  searchInput?.addEventListener("input", render);
  classFilter?.addEventListener("change", render);
  typeFilter?.addEventListener("change", render);
  sortSelect?.addEventListener("change", render);

  // ===================================================
  // STATISTIQUES
  // ===================================================

  function updateStats() {

    if (studentCount) {
      studentCount.textContent = students.length;
    }

    if (punishmentCount) {
      punishmentCount.textContent = punishments.length;
    }

    if (todayCount) {
      const today = todayString();

      const count = punishments.filter(
        punishment => punishment.date === today
      ).length;

      todayCount.textContent = count;
    }
  }

  // ===================================================
  // BOUTONS PRINCIPAUX
  // ===================================================

  addStudentBtn?.addEventListener("click", event => {
    event.preventDefault();
    openStudentForm();
  });

  addPunishmentBtn?.addEventListener("click", event => {
    event.preventDefault();
    openPunishmentForm();
  });

  // ===================================================
  // CHARGEMENT DES DONNÉES
  // ===================================================

  async function loadData() {
    try {

      const [studentsData, punishmentsData] =
        await Promise.all([
          api("/api/students"),
          api("/api/punishments")
        ]);

      students = Array.isArray(studentsData)
        ? studentsData
        : [];

      punishments = Array.isArray(punishmentsData)
        ? punishmentsData
        : [];

      render();

    } catch (error) {

      console.error(error);

      showToast(
        "Impossible de charger les données : " +
        error.message
      );
    }
  }

  // ===================================================
  // NOTIFICATIONS PUSH
  // ===================================================

  async function setupPush() {

    if (!pushBtn) return;

    if (!("serviceWorker" in navigator)) {
      pushBtn.disabled = true;
      pushBtn.textContent = "Notifications non disponibles";
      return;
    }

    try {

      const config = await api("/api/config");

      if (!config.pushConfigured) {
        pushBtn.textContent =
          "Notifications non configurées";
        return;
      }

      pushBtn.addEventListener("click", async () => {

        try {

          const registration =
            await navigator.serviceWorker.register("/sw.js");

          const permission =
            await Notification.requestPermission();

          if (permission !== "granted") {
            showToast("Notifications refusées.");
            return;
          }

          if (!config.vapidPublicKey) {
            showToast("Clé VAPID manquante.");
            return;
          }

          const subscription =
            await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey:
                urlBase64ToUint8Array(
                  config.vapidPublicKey
                )
            });

          await api("/api/push/subscribe", {
            method: "POST",
            body: JSON.stringify(subscription)
          });

          pushBtn.textContent =
            "Notifications activées ✓";

          showToast(
            "Notifications activées."
          );

        } catch (error) {

          console.error(error);

          showToast(
            "Impossible d'activer les notifications."
          );
        }
      });

    } catch (error) {

      console.error(
        "Push configuration :",
        error
      );
    }
  }

  function urlBase64ToUint8Array(base64String) {

    const padding =
      "=".repeat(
        (4 - (base64String.length % 4)) % 4
      );

    const base64 =
      (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData =
      window.atob(base64);

    return Uint8Array.from(
      [...rawData].map(char => char.charCodeAt(0))
    );
  }

  // ===================================================
  // SERVICE WORKER
  // ===================================================

  async function registerServiceWorker() {

    if (!("serviceWorker" in navigator)) {
      return;
    }

    try {
      await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker enregistré.");
    } catch (error) {
      console.error(
        "Service Worker :",
        error
      );
    }
  }

  // ===================================================
  // DÉMARRAGE
  // ===================================================

  console.log("Punitions ISL : app.js chargé.");

  loadData();
  registerServiceWorker();
  setupPush();

});
