// Show selected week
function showWeek(number) {

  let weeks = document.querySelectorAll(".week");

  weeks.forEach(function(week) {
    week.classList.remove("active");
  });

  document.getElementById("week" + number).classList.add("active");
}