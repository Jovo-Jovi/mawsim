(function () {
  try {
    var stored = localStorage.getItem("mawsim-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch {
    /* storage blocked: leave the system theme */
  }
})();
