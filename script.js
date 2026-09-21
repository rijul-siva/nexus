/* ==========================================================================
   Nexus Workspace - jQuery Application Engine
   UBCA301L Full Stack Application Development
   ========================================================================== */

$(function () {

  // 1. Data Storage Keys & Storage Utilities
  var USERS_KEY = "nexus_users";
  var SESSION_KEY = "nexus_current_user";

  function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function filesKey(user) { return "nexus_files_" + user; }

  function getFiles(user) {
    var raw = localStorage.getItem(filesKey(user));
    if (!raw) {
      var initialFiles = [
        { id: 101, name: "Project Overview.txt", type: "Document", content: "Welcome to Nexus Workspace!\nType your project notes or code here." },
        { id: 102, name: "Budget Draft.csv", type: "Spreadsheet", content: "Category, Q1, Q2\nDesign, 1200, 1500\nDev, 3000, 3500" }
      ];
      localStorage.setItem(filesKey(user), JSON.stringify(initialFiles));
      return initialFiles;
    }
    return JSON.parse(raw);
  }

  function saveFiles(user, files) { localStorage.setItem(filesKey(user), JSON.stringify(files)); }

  function formatBytes(b) {
    if (b < 1024) return b + " B";
    return (b / 1024).toFixed(1) + " KB";
  }

  // 2. Login Page Logic (#loginForm)
  var $loginForm = $("#loginForm");
  if ($loginForm.length) {
    $loginForm.on("submit", function (e) {
      e.preventDefault();
      $(this).addClass("was-validated");
      if (!this.checkValidity()) return;

      var username = $("#username").val().trim();
      var password = $("#password").val();
      var userMatch = getUsers().find(function (u) { return u.username === username && u.password === password; });

      if (!userMatch) {
        $("#loginAlert").text("Incorrect username or password.").show();
        return;
      }
      sessionStorage.setItem(SESSION_KEY, username);
      window.location.href = "home.html";
    });
  }

  // 3. Signup Page Logic (#signupForm)
  var $signupForm = $("#signupForm");
  if ($signupForm.length) {
    $("#experience").on("input", function () { $("#experienceValue").text($(this).val()); });

    $signupForm.on("submit", function (e) {
      e.preventDefault();
      $(this).addClass("was-validated");

      var pass = $("#regPassword").val();
      var conf = $("#confirmPassword").val();
      $("#confirmPassword")[0].setCustomValidity(pass !== conf ? "Passwords must match." : "");

      if (!this.checkValidity()) return;

      var username = $("#regUsername").val().trim();
      var users = getUsers();
      if (users.some(function (u) { return u.username === username; })) {
        $("#signupAlert").text("Username is already taken.").show();
        return;
      }

      users.push({ username: username, password: pass, fullName: $("#fullName").val().trim(), email: $("#email").val().trim() });
      saveUsers(users);
      window.location.href = "login.html";
    });
  }

  // 4. Home Dashboard Logic (#fileGrid)
  var $fileGrid = $("#fileGrid");
  if ($fileGrid.length) {
    var currentUser = sessionStorage.getItem(SESSION_KEY);
    if (!currentUser) { window.location.href = "login.html"; return; }
    $("#currentUserLabel").text(currentUser);

    function renderHomeFiles(query) {
      $fileGrid.find("[data-id]").remove();
      var files = getFiles(currentUser);

      if (query) {
        var q = query.toLowerCase();
        files = files.filter(function (f) { return f.name.toLowerCase().includes(q) || (f.content || "").toLowerCase().includes(q); });
      }

      $.each(files, function (i, file) {
        var initials = file.name.substring(0, 2).toUpperCase();
        var size = formatBytes((file.name || "").length + (file.content || "").length);
        var cardHtml =
          '<div class="col-6 col-md-4 col-lg-3" data-id="' + file.id + '">' +
          '  <div class="card h-100 file-card p-3">' +
          '    <div class="d-flex justify-content-between mb-2"><div class="file-icon">' + initials + '</div><span class="badge bg-white text-secondary border small">' + size + '</span></div>' +
          '    <h2 class="h6 mb-1 text-truncate fw-bold text-dark">' + file.name + '</h2>' +
          '    <p class="text-secondary small mb-3">' + file.type + '</p>' +
          '    <div class="d-flex gap-2 mt-auto">' +
          '      <a href="editor.html?id=' + file.id + '" class="btn btn-sm btn-primary flex-grow-1"><i class="ti ti-edit"></i> Edit</a>' +
          '      <button class="btn btn-outline-danger btn-sm delete-file"><i class="ti ti-trash"></i></button>' +
          '    </div>' +
          '  </div>' +
          '</div>';
        $fileGrid.append(cardHtml);
      });

      $("#fileCount").text(files.length);
      files.length === 0 ? $("#emptyState").show() : $("#emptyState").hide();
    }

    renderHomeFiles();
    $("#homeSearchInput").on("input", function () { renderHomeFiles($(this).val().trim()); });

    $("#createFileForm").on("submit", function (e) {
      e.preventDefault();
      var name = $("#fileName").val().trim();
      if (!name) return;

      var files = getFiles(currentUser);
      var newFile = { id: Date.now(), name: name, type: $("#fileType").val(), content: $("#initialContent").val().trim() || "Sample text for " + name };
      files.push(newFile);
      saveFiles(currentUser, files);

      bootstrap.Modal.getInstance(document.getElementById("createFileModal")).hide();
      window.location.href = "editor.html?id=" + newFile.id;
    });

    $(document).on("click", ".delete-file", function (e) {
      e.stopPropagation();
      var $card = $(this).closest("[data-id]");
      var id = $card.data("id");
      if (confirm("Delete this file?")) {
        var files = getFiles(currentUser).filter(function (f) { return f.id !== id; });
        saveFiles(currentUser, files);
        $card.fadeOut(200, function () { $(this).remove(); $("#fileCount").text($fileGrid.find("[data-id]").length); });
      }
    });

    $("#logoutBtn").on("click", function () { sessionStorage.removeItem(SESSION_KEY); window.location.href = "login.html"; });
  }

  // 5. Workspace Editor Logic (#editorViewport)
  var $editorViewport = $("#editorViewport");
  if ($editorViewport.length) {
    var currentUser = sessionStorage.getItem(SESSION_KEY);
    if (!currentUser) { window.location.href = "login.html"; return; }
    $("#currentUserLabel, #profileModalUsername").text(currentUser);

    var activeFileId = parseInt(new URLSearchParams(window.location.search).get("id"), 10);
    var userFiles = getFiles(currentUser);
    var activeFile = userFiles.find(function (f) { return f.id === activeFileId; }) || userFiles[0];

    function updateStorage() {
      var total = userFiles.reduce(function (sum, f) { return sum + (f.name || "").length + (f.content || "").length; }, 0);
      $("#storageUsageLabel").text(formatBytes(total));
      $("#profileStorageText").text(formatBytes(total) + " / 10 MB");
    }

    function renderTree() {
      var $tree = $("#editorFileTree").empty();
      $.each(userFiles, function (i, file) {
        var activeClass = (activeFile && file.id === activeFile.id) ? "active" : "";
        $tree.append('<div class="tree-item ' + activeClass + '" data-file-id="' + file.id + '"><i class="ti ti-file-text"></i> <span class="text-truncate">' + file.name + '</span></div>');
      });
      if (activeFile) {
        $("#activeProjectName").text(activeFile.name);
        $("#editorSheetTitle").text(activeFile.name + " (" + activeFile.type + ")");
        $("#fileContentArea").val(activeFile.content || "");
      }
      updateStorage();
    }

    renderTree();

    $(document).on("click", "#editorFileTree .tree-item[data-file-id]", function () {
      var fid = $(this).data("file-id");
      activeFile = userFiles.find(function (f) { return f.id === fid; });
      renderTree();
      showToast('Opened "' + activeFile.name + '"');
    });

    // Live Auto-Save
    var autoSaveTimer = null;
    $("#fileContentArea").on("input", function () {
      if (!activeFile) return;
      $("#editorSaveStatus").text("Saving...").addClass("bg-warning text-dark");
      activeFile.content = $(this).val();

      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(function () {
        saveFiles(currentUser, userFiles);
        updateStorage();
        $("#editorSaveStatus").text("Saved").removeClass("bg-warning text-dark").addClass("bg-white text-secondary");
      }, 400);
    });

    $("#saveContentBtn").on("click", function () {
      if (!activeFile) return;
      activeFile.content = $("#fileContentArea").val();
      saveFiles(currentUser, userFiles);
      updateStorage();
      showToast('Saved "' + activeFile.name + '"');
    });

    // File Download Handler
    $("#downloadBtn").on("click", function () {
      if (!activeFile) return;
      var blob = new Blob([activeFile.content || ""], { type: "text/plain;charset=utf-8" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = activeFile.name || "document.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloaded "' + activeFile.name + '"');
    });

    // Sidebar Toggle
    var sidebarCollapsed = false;
    $("#sidebarToggle").on("click", function () {
      sidebarCollapsed = !sidebarCollapsed;
      $("#sidebarIslands").toggleClass("collapsed", sidebarCollapsed);
      $("#editorTextSheet").toggleClass("sidebar-collapsed", sidebarCollapsed);
      $("#sidebarToggleIcon").toggleClass("ti-chevron-left", !sidebarCollapsed).toggleClass("ti-chevron-right", sidebarCollapsed);
    });

    // Canvas Right-Click Interactive Note
    var nodeCount = 0;
    $("#editorViewport").on("contextmenu", function (e) {
      if ($(e.target).closest("#editorTextSheet, .island").length) return;
      e.preventDefault();
      nodeCount++;
      var offset = $(this).offset();
      var relX = e.pageX - offset.left, relY = e.pageY - offset.top;

      $("#canvasNodes").append('<div class="placed-node island" style="top:' + relY + 'px; left:' + relX + 'px;"><i class="ti ti-point-filled text-primary"></i> Note #' + nodeCount + '</div>');
      showToast("Created Note #" + nodeCount);
    });

    function showToast(msg) {
      $("#editorToastText").text(msg);
      var toastEl = document.getElementById("editorToast");
      if (toastEl) new bootstrap.Toast(toastEl, { delay: 1800 }).show();
    }

    $("#photoIslandBtn").on("click", function () {
      $("#canvasNodes").append('<div class="placed-node island" style="top:120px; left:280px;"><i class="ti ti-photo text-success"></i> Image Node</div>');
      showToast("Image node added");
    });

    $("#shareIslandBtn").on("click", function () { showToast("Link copied to clipboard!"); });
    $("#undoBtn").on("click", function () { document.execCommand("undo"); showToast("Undo action"); });
    $("#redoBtn").on("click", function () { document.execCommand("redo"); showToast("Redo action"); });

    $("#deleteActiveFileBtn").on("click", function () {
      if (!activeFile || !confirm('Delete "' + activeFile.name + '"?')) return;
      userFiles = userFiles.filter(function (f) { return f.id !== activeFile.id; });
      saveFiles(currentUser, userFiles);
      if (userFiles.length > 0) { activeFile = userFiles[0]; renderTree(); showToast("File deleted"); }
      else { window.location.href = "home.html"; }
    });

    $("#createFileFormEditor").on("submit", function (e) {
      e.preventDefault();
      var name = $("#editorFileName").val().trim();
      if (!name) return;

      var newFile = { id: Date.now(), name: name, type: $("#editorFileType").val(), content: $("#editorInitialContent").val().trim() || "Content for " + name };
      userFiles.push(newFile);
      saveFiles(currentUser, userFiles);
      activeFile = newFile;
      renderTree();

      bootstrap.Modal.getInstance(document.getElementById("createFileModal")).hide();
      showToast('Created "' + name + '"');
    });

    $("#searchInput").on("input", function () {
      var q = $(this).val().toLowerCase().trim(), $res = $("#searchResultsList").empty();
      var matches = userFiles.filter(function (f) { return f.name.toLowerCase().includes(q) || (f.content || "").toLowerCase().includes(q); });
      if (!matches.length) { $res.append('<div class="p-3 text-muted small">No matches found.</div>'); return; }
      $.each(matches, function (i, f) {
        $res.append('<a href="#" class="list-group-item list-group-item-action d-flex justify-content-between select-file" data-id="' + f.id + '"><span>' + f.name + '</span><span class="btn btn-sm btn-outline-primary py-0">Open</span></a>');
      });
    });

    $(document).on("click", ".select-file", function (e) {
      e.preventDefault();
      activeFile = userFiles.find(function (f) { return f.id === $(this).data("id"); });
      renderTree();
      bootstrap.Modal.getInstance(document.getElementById("searchModal")).hide();
    });

    $("#sidebarLogoutBtn, #profileLogoutBtn, #logoutBtn").on("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "login.html";
    });
  }

});
