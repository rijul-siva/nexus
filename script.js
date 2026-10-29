
$(function () {

  // =====================================================================
  // 1. Data Storage Keys & Storage Utilities
  // =====================================================================
  var USERS_KEY   = "nexus_users";
  var SESSION_KEY = "nexus_current_user";

  function getUsers()      { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  function saveUsers(u)    { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
  function filesKey(user)  { return "nexus_files_" + user; }

  function getFiles(user) {
    var raw = localStorage.getItem(filesKey(user));
    if (!raw) {
      var initialFiles = [
        { id: 101, name: "Project Overview.txt", type: "Document",    content: "Welcome to Nexus Workspace!\nType your project notes or code here." },
        { id: 102, name: "Budget Draft.csv",     type: "Spreadsheet", content: "Category, Q1, Q2\nDesign, 1200, 1500\nDev, 3000, 3500" }
      ];
      localStorage.setItem(filesKey(user), JSON.stringify(initialFiles));
      return initialFiles;
    }
    return JSON.parse(raw);
  }

  function saveFiles(user, files) { localStorage.setItem(filesKey(user), JSON.stringify(files)); }

  function calculateAge(dob) {
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
    var parts = dob.split("-").map(Number);
    var birth = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (birth.getUTCFullYear() !== parts[0] || birth.getUTCMonth() !== parts[1] - 1 || birth.getUTCDate() !== parts[2]) return null;
    var now = new Date();
    var year = now.getUTCFullYear(), month = now.getUTCMonth() + 1, day = now.getUTCDate();
    var age = year - parts[0];
    if (month < parts[1] || (month === parts[1] && day < parts[2])) age -= 1;
    return age;
  }

  function shiftUtcYear(date, years) {
    var year = date.getUTCFullYear() + years;
    var month = date.getUTCMonth();
    var day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
    return new Date(Date.UTC(year, month, day));
  }

  function formatBytes(b) {
    if (b < 1024) return b + " B";
    return (b / 1024).toFixed(1) + " KB";
  }

  // =====================================================================
  // 2. Shared Validation Helpers
  // =====================================================================

  /**
   * Returns true if the string is empty or contains only whitespace/special chars.
   * Meaning: there is no real alphanumeric or letter content.
   */
  function isMeaninglessString(val) {
    return !val || val.trim().length === 0 || !/[A-Za-z0-9]/.test(val);
  }

  /** Username: 3-30 chars, only letters, digits, underscore, hyphen. */
  var RE_USERNAME   = /^[A-Za-z0-9_\-]{3,30}$/;
  /** Full name: starts with a letter, then letters/spaces/hyphens/apostrophes, 2-60 chars total. */
  var RE_FULLNAME   = /^[A-Za-z][A-Za-z\s'\-]{1,59}$/;
  /** Indian 10-digit mobile (optionally +91 or 0 prefix). */
  var RE_PHONE      = /^(\+91|0)?[6-9][0-9]{9}$/;
  /** Password strength: at least one letter + at least one digit. */
  var RE_PASS_STRENGTH = /^(?=.*[A-Za-z])(?=.*\d).+$/;
  /** City: letters, spaces, hyphens, dots. */
  var RE_CITY       = /^[A-Za-z][A-Za-z\s\-\.]{0,49}$/;
  /** File name: letters, digits, spaces, dots, underscores, hyphens (no pure specials). */
  var RE_FILENAME   = /^[A-Za-z0-9][A-Za-z0-9\s_\-\.]{0,99}$/;

  /** Show a Bootstrap invalid-feedback message on a field. */
  function setInvalid($field, msg) {
    $field[0].setCustomValidity(msg || "invalid");
    var feedback = $field.closest(".mb-3, .col-md-6, .col-md-4, .col-12").find(".invalid-feedback").first();
    if (!feedback.length) feedback = $field.siblings(".invalid-feedback").first();
    if (msg && feedback.length) feedback.text(msg);
  }

  /** Clear custom validity (mark field as valid for custom checks). */
  function setValid($field) {
    $field[0].setCustomValidity("");
  }

  // =====================================================================
  // 3. Landing Page Logic (index.html — no special JS needed)
  // =====================================================================
  // If user is already logged in, redirect landing page to home.html
  if ($("body").hasClass("landing-page")) {
    var _sess = sessionStorage.getItem(SESSION_KEY);
    if (_sess) {
      window.location.href = "home.html";
    }
  }

  // =====================================================================
  // 4. Login Page Logic (#loginForm)
  // =====================================================================
  var $loginForm = $("#loginForm");
  if ($loginForm.length) {

    // Real-time clear custom validity on typing
    $("#username").on("input", function () { setValid($(this)); });
    $("#password").on("input", function () { setValid($(this)); });

    $loginForm.on("submit", function (e) {
      e.preventDefault();

      var $username = $("#username");
      var $password = $("#password");
      var username  = $username.val().trim();
      var password  = $password.val();

      // --- Custom validation ---
      var valid = true;

      // Username: must match pattern (no spaces, no blank, no specials)
      if (!RE_USERNAME.test(username)) {
        setInvalid($username, "Username must be 3–30 characters using only letters, numbers, _ or -.");
        valid = false;
      } else {
        setValid($username);
      }

      // Password: must not be blank or only spaces
      if (!password || password.trim().length === 0) {
        setInvalid($password, "Please enter your password.");
        valid = false;
      } else if (password.length < 8 || password.length > 72 || new TextEncoder().encode(password).length > 72) {
        setInvalid($password, "Password must be 8–72 characters and no more than 72 UTF-8 bytes.");
        valid = false;
      } else {
        setValid($password);
      }

      $(this).addClass("was-validated");
      if (!valid || !this.checkValidity()) return;

      // --- Authenticate ---
      var userMatch = getUsers().find(function (u) {
        return u.username === username && u.password === password;
      });

      if (!userMatch) {
        $("#loginAlert").text("Incorrect username or password.").removeClass("d-none").show();
        return;
      }

      $("#loginAlert").addClass("d-none").hide();
      sessionStorage.setItem(SESSION_KEY, username);
      window.location.href = "home.html";
    });
  }

  // =====================================================================
  // 5. Signup Page Logic (#signupForm)
  // =====================================================================
  var $signupForm = $("#signupForm");
  if ($signupForm.length) {

    // --- Set DOB min/max dynamically ---
    var now = new Date();
    var today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    var maxDob = shiftUtcYear(today, -10); // latest DOB that meets the 10-year minimum
    var minDob = shiftUtcYear(today, -101); // earliest DOB whose calculated age can still be 100
    minDob.setUTCDate(minDob.getUTCDate() + 1);
    var toISO = function (d) { return [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, "0"), String(d.getUTCDate()).padStart(2, "0")].join("-"); };
    $("#dob").attr("max", toISO(maxDob)).attr("min", toISO(minDob));
    $("#age").prop("readonly", true);
    $("#dob").on("input change", function () {
      var dob = $(this).val();
      var age = calculateAge(dob);
      $("#age").val(age !== null && age >= 10 && age <= 100 ? age : "");
      if (dob && (age === null || age < 10 || age > 100)) {
        setInvalid($("#dob"), "Date of birth must be valid and indicate an age between 10 and 100.");
      } else {
        setValid($("#dob"));
      }
    });

    // --- Experience slider label ---
    $("#experience").on("input", function () {
      var v = parseInt($(this).val(), 10);
      $("#experienceValue").text(v);
      $("#experiencePlural").text(v === 1 ? "" : "s");
    });

    // --- Bio char counter ---
    $("#bio").on("input", function () {
      var len = $(this).val().length;
      $("#bioCharCount").text(len + " / 300");
      setValid($(this)); // clear any previous custom error on typing
      if (len > 300) setInvalid($(this), "Bio must be no longer than 300 characters.");
    });

    // Real-time clear on input for key fields
    ["fullName","regUsername","email","phone","regPassword","confirmPassword","portfolio","city"]
      .forEach(function (id) {
        $("#" + id).on("input change", function () { setValid($(this)); });
      });

    $signupForm.on("submit", function (e) {
      e.preventDefault();

      var valid = true;

      // --- Full Name ---
      var fullName = $("#fullName").val();
      if (!fullName || !RE_FULLNAME.test(fullName.trim())) {
        setInvalid($("#fullName"), "Please enter a valid full name (letters, spaces, hyphens, apostrophes; min 2 chars).");
        valid = false;
      } else {
        setValid($("#fullName"));
      }

      // --- Username ---
      var username = $("#regUsername").val().trim();
      if (!RE_USERNAME.test(username)) {
        setInvalid($("#regUsername"), "Username must be 3–30 characters: letters, numbers, _ or - only.");
        valid = false;
      } else {
        setValid($("#regUsername"));
      }

      // --- Email: rely on browser type=email but also check not blank/spaces ---
      var email = $("#email").val().trim();
      if (!email || isMeaninglessString(email)) {
        setInvalid($("#email"), "Please enter a valid email address.");
        valid = false;
      } else {
        setValid($("#email"));
      }

      // --- Phone (optional, validate if filled) ---
      var phone = $("#phone").val().trim();
      if (phone.length > 0 && !RE_PHONE.test(phone)) {
        setInvalid($("#phone"), "Enter a valid 10-digit Indian mobile number (e.g. 9876543210).");
        valid = false;
      } else {
        setValid($("#phone"));
      }

      // --- Password ---
      var pass = $("#regPassword").val();
      if (!pass || pass.trim().length === 0) {
        setInvalid($("#regPassword"), "Password cannot be empty or only spaces.");
        valid = false;
      } else if (pass.length < 8 || pass.length > 72 || new TextEncoder().encode(pass).length > 72) {
        setInvalid($("#regPassword"), "Password must be 8–72 characters and no more than 72 UTF-8 bytes.");
        valid = false;
      } else if (!RE_PASS_STRENGTH.test(pass)) {
        setInvalid($("#regPassword"), "Password must contain at least one letter and one digit.");
        valid = false;
      } else {
        setValid($("#regPassword"));
      }

      // --- Confirm Password ---
      var conf = $("#confirmPassword").val();
      if (conf !== pass) {
        setInvalid($("#confirmPassword"), "Passwords must match.");
        valid = false;
      } else {
        setValid($("#confirmPassword"));
      }

      // --- DOB (optional, validate if filled) ---
      var dob = $("#dob").val();
      var age = dob ? calculateAge(dob) : null;
      if (dob && (age === null || age < 10 || age > 100)) {
        setInvalid($("#dob"), "Date of birth must be valid and indicate an age between 10 and 100.");
        valid = false;
      } else if (dob) {
        setValid($("#dob"));
      } else {
        setValid($("#dob"));
      }
      $("#age").val(age !== null && age >= 10 && age <= 100 ? age : "");

      // --- Portfolio URL (optional, validate if filled) ---
      var portfolio = $("#portfolio").val().trim();
      if (portfolio.length > 2048) {
        setInvalid($("#portfolio"), "Portfolio URL must be at most 2048 characters.");
        valid = false;
      } else if (portfolio.length > 0) {
        var parsedPortfolio;
        try { parsedPortfolio = new URL(portfolio); } catch (error) { parsedPortfolio = null; }
        if (!parsedPortfolio || !["http:", "https:"].includes(parsedPortfolio.protocol) || !parsedPortfolio.hostname.includes(".")) {
          setInvalid($("#portfolio"), "Please enter a valid URL (must start with http:// or https://).");
          valid = false;
        } else {
          setValid($("#portfolio"));
        }
      } else {
        setValid($("#portfolio"));
      }

      // --- City (optional, validate if filled) ---
      var city = $("#city").val().trim();
      if (city.length > 50 || (city.length > 0 && !RE_CITY.test(city))) {
        setInvalid($("#city"), city.length > 50 ? "City must be no longer than 50 characters." : "City name should contain only letters, spaces, hyphens, or dots.");
        valid = false;
      } else {
        setValid($("#city"));
      }

      // --- Bio (optional, validate if filled — must not be only whitespace/special chars) ---
      var bio = $("#bio").val();
      if (bio.length > 300 || (bio.length > 0 && isMeaninglessString(bio))) {
        setInvalid($("#bio"), bio.length > 300 ? "Bio must be no longer than 300 characters." : "Bio must contain at least some real text (not just spaces or symbols).");
        valid = false;
      } else {
        setValid($("#bio"));
      }

      $(this).addClass("was-validated");
      if (!valid || !this.checkValidity()) return;

      // --- Check duplicate username ---
      var users = getUsers();
      if (users.some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); })) {
        $("#signupAlert").text("Username is already taken. Please choose another.").removeClass("d-none").show();
        return;
      }
      if (users.some(function (u) { return u.email && u.email.toLowerCase() === email.toLowerCase(); })) {
        $("#signupAlert").text("An account with this email already exists.").removeClass("d-none").show();
        return;
      }

      // --- Save & redirect ---
      users.push({
        username: username,
        password: pass,
        fullName: fullName.trim(),
        email:    email.toLowerCase(),
        phone:    phone,
        dob:      dob || "",
        age:      age,
        course:   $("#course").val(),
        city:     city,
        bio:      bio.trim(),
        portfolio: portfolio,
        accountType: $("input[name='accountType']:checked").val(),
        favColor: $("#favColor").val(),
        experience: Number($("#experience").val())
      });
      saveUsers(users);
      $("#signupAlert").addClass("d-none").hide();
      window.location.href = "login.html";
    });
  }

  // =====================================================================
  // 6. Home Dashboard Logic (#fileGrid)
  // =====================================================================
  var $fileGrid = $("#fileGrid");
  if ($fileGrid.length) {
    var currentUser = sessionStorage.getItem(SESSION_KEY);
    // Not logged in — redirect to landing, not login directly
    if (!currentUser) { window.location.href = "index.html"; return; }
    $("#currentUserLabel").text(currentUser);

    function renderHomeFiles(query) {
      $fileGrid.find("[data-id]").remove();
      var files = getFiles(currentUser);

      if (query) {
        var q = query.toLowerCase();
        files = files.filter(function (f) {
          return f.name.toLowerCase().includes(q) || (f.content || "").toLowerCase().includes(q);
        });
      }

      $.each(files, function (i, file) {
        var initials = file.name.substring(0, 2).toUpperCase();
        var size     = formatBytes((file.name || "").length + (file.content || "").length);
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

    // Create file form — validate file name
    $("#createFileForm").on("submit", function (e) {
      e.preventDefault();
      var $nameField = $("#fileName");
      var name = $nameField.val().trim();

      if (!name || name.length > 100 || isMeaninglessString(name)) {
        $nameField.addClass("is-invalid");
        $nameField.next(".invalid-feedback").text(name.length > 100 ? "File name must be at most 100 characters." : "Please enter a valid file name.");
        return;
      }
      if (!RE_FILENAME.test(name)) {
        $nameField.addClass("is-invalid");
        $nameField.next(".invalid-feedback").text("File name can only contain letters, numbers, spaces, dots, underscores, or hyphens.");
        return;
      }
      $nameField.removeClass("is-invalid").addClass("is-valid");

      var initialContent = $("#initialContent").val();
      if (initialContent.length > 10000) {
        $("#initialContent").addClass("is-invalid");
        $("#initialContentFeedback").text("Content must be at most 10000 characters.");
        return;
      }
      $("#initialContent").removeClass("is-invalid");
      var files   = getFiles(currentUser);
      if (files.some(function (file) { return file.name.toLowerCase() === name.toLowerCase(); })) {
        $nameField.addClass("is-invalid");
        $nameField.next(".invalid-feedback").text("A file with this name already exists.");
        return;
      }
      var newFile = {
        id:      Date.now(),
        name:    name,
        type:    $("#fileType").val(),
        content: initialContent.trim() || "Sample text for " + name
      };
      files.push(newFile);
      saveFiles(currentUser, files);

      bootstrap.Modal.getInstance(document.getElementById("createFileModal")).hide();
      window.location.href = "editor.html?id=" + newFile.id;
    });

    // Clear invalid state when user types in file name
    $("#fileName").on("input", function () {
      $(this).removeClass("is-invalid is-valid");
    });
    $("#initialContent").on("input", function () { $(this).removeClass("is-invalid"); });

    $(document).on("click", ".delete-file", function (e) {
      e.stopPropagation();
      var $card = $(this).closest("[data-id]");
      var id    = $card.data("id");
      if (confirm("Delete this file? This cannot be undone.")) {
        var files = getFiles(currentUser).filter(function (f) { return f.id !== id; });
        saveFiles(currentUser, files);
        $card.fadeOut(200, function () {
          $(this).remove();
          $("#fileCount").text($fileGrid.find("[data-id]").length);
        });
      }
    });

    $("#logoutBtn").on("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "index.html";
    });
  }

  // =====================================================================
  // 7. Workspace Editor Logic (#editorViewport)
  // =====================================================================
  var $editorViewport = $("#editorViewport");
  if ($editorViewport.length) {
    var currentUser = sessionStorage.getItem(SESSION_KEY);
    // Not logged in — redirect to landing
    if (!currentUser) { window.location.href = "index.html"; return; }
    $("#currentUserLabel, #profileModalUsername").text(currentUser);

    var activeFileId = parseInt(new URLSearchParams(window.location.search).get("id"), 10);
    var userFiles    = getFiles(currentUser);
    var activeFile   = userFiles.find(function (f) { return f.id === activeFileId; }) || userFiles[0];

    function updateStorage() {
      var total = userFiles.reduce(function (sum, f) {
        return sum + (f.name || "").length + (f.content || "").length;
      }, 0);
      $("#storageUsageLabel").text(formatBytes(total));
      $("#profileStorageText").text(formatBytes(total) + " / 10 MB");
    }

    function renderTree() {
      var $tree = $("#editorFileTree").empty();
      $.each(userFiles, function (i, file) {
        var activeClass = (activeFile && file.id === activeFile.id) ? "active" : "";
        $tree.append(
          '<div class="tree-item ' + activeClass + '" data-file-id="' + file.id + '">' +
          '<i class="ti ti-file-text"></i> <span class="text-truncate">' + file.name + '</span></div>'
        );
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
      if ($(this).val().length > 10000) {
        $("#editorSaveStatus").text("Not saved: 10,000 character limit").removeClass("bg-warning").addClass("bg-danger text-white");
        return;
      }
      $("#editorSaveStatus").text("Saving...").removeClass("bg-danger text-white").addClass("bg-warning text-dark");
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
      if ($("#fileContentArea").val().length > 10000) {
        showToast("Content cannot exceed 10,000 characters.");
        return;
      }
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
      $("#canvasNodes").append(
        '<div class="placed-node island" style="top:' + relY + 'px; left:' + relX + 'px;">' +
        '<i class="ti ti-point-filled text-primary"></i> Note #' + nodeCount + '</div>'
      );
      showToast("Created Note #" + nodeCount);
    });

    function showToast(msg) {
      $("#editorToastText").text(msg);
      var toastEl = document.getElementById("editorToast");
      if (toastEl) new bootstrap.Toast(toastEl, { delay: 1800 }).show();
    }

    $("#photoIslandBtn").on("click", function () {
      $("#canvasNodes").append(
        '<div class="placed-node island" style="top:120px; left:280px;">' +
        '<i class="ti ti-photo text-success"></i> Image Node</div>'
      );
      showToast("Image node added");
    });

    $("#shareIslandBtn").on("click", function () { showToast("Link copied to clipboard!"); });
    $("#undoBtn").on("click",  function () { document.execCommand("undo"); showToast("Undo action"); });
    $("#redoBtn").on("click",  function () { document.execCommand("redo"); showToast("Redo action"); });

    $("#deleteActiveFileBtn").on("click", function () {
      if (!activeFile || !confirm('Delete "' + activeFile.name + '"? This cannot be undone.')) return;
      userFiles = userFiles.filter(function (f) { return f.id !== activeFile.id; });
      saveFiles(currentUser, userFiles);
      if (userFiles.length > 0) {
        activeFile = userFiles[0];
        renderTree();
        showToast("File deleted");
      } else {
        window.location.href = "home.html";
      }
    });

    // Editor create file modal — validate file name
    $("#createFileFormEditor").on("submit", function (e) {
      e.preventDefault();
      var $nameField = $("#editorFileName");
      var name = $nameField.val().trim();

      if (!name || name.length > 100 || isMeaninglessString(name)) {
        $nameField.addClass("is-invalid");
        return;
      }
      if (!RE_FILENAME.test(name)) {
        $nameField.addClass("is-invalid");
        return;
      }
      $nameField.removeClass("is-invalid").addClass("is-valid");

      var editorInitialContent = $("#editorInitialContent").val();
      if (editorInitialContent.length > 10000) {
        $("#editorInitialContent").addClass("is-invalid");
        $("#editorInitialContentFeedback").text("Content must be at most 10000 characters.");
        return;
      }
      $("#editorInitialContent").removeClass("is-invalid");
      if (userFiles.some(function (file) { return file.name.toLowerCase() === name.toLowerCase(); })) {
        $nameField.addClass("is-invalid");
        $("#editorFileNameFeedback").text("A file with this name already exists.");
        return;
      }
      var newFile = {
        id:      Date.now(),
        name:    name,
        type:    $("#editorFileType").val(),
        content: editorInitialContent.trim() || "Content for " + name
      };
      userFiles.push(newFile);
      saveFiles(currentUser, userFiles);
      activeFile = newFile;
      renderTree();

      bootstrap.Modal.getInstance(document.getElementById("createFileModal")).hide();
      showToast('Created "' + name + '"');
    });

    // Clear validation on file name input in editor modal
    $("#editorFileName").on("input", function () {
      $(this).removeClass("is-invalid is-valid");
    });
    $("#editorInitialContent").on("input", function () { $(this).removeClass("is-invalid"); });

    $("#searchInput").on("input", function () {
      var q   = $(this).val().toLowerCase().trim();
      var $res = $("#searchResultsList").empty();
      var matches = userFiles.filter(function (f) {
        return f.name.toLowerCase().includes(q) || (f.content || "").toLowerCase().includes(q);
      });
      if (!matches.length) {
        $res.append('<div class="p-3 text-muted small">No matches found.</div>');
        return;
      }
      $.each(matches, function (i, f) {
        $res.append(
          '<a href="#" class="list-group-item list-group-item-action d-flex justify-content-between select-file" data-id="' + f.id + '">' +
          '<span>' + f.name + '</span><span class="btn btn-sm btn-outline-primary py-0">Open</span></a>'
        );
      });
    });

    $(document).on("click", ".select-file", function (e) {
      e.preventDefault();
      activeFile = userFiles.find(function (f) { return f.id === $(this).data("id"); }.bind(this));
      renderTree();
      bootstrap.Modal.getInstance(document.getElementById("searchModal")).hide();
    });

    $("#sidebarLogoutBtn, #profileLogoutBtn, #logoutBtn").on("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = "index.html";
    });
  }

});
