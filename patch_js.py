import re

file_path = "CourseOfTemptation.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

helper_function = """
setup.get_date_conflict_string = function(day, time, endtime) {
\tif (!V.planneddate) return "";
\tlet conflicts = [];
\tfor (const date of V.planneddate) {
\t\tif (date.day == day) {
\t\t\tlet d_time = date.time || 0;
\t\t\tlet d_endtime = date.endtime || 24;
\t\t\tif (time < d_endtime && endtime > d_time) {
\t\t\t\tlet partnerName = date.partner ? (setup.people.can_identify_name(date.partner) ? setup.people.firstname(date.partner) : "someone") : "someone";
\t\t\t\tlet activityName = date.activity ? date.activity : "hangout";
\t\t\t\tconflicts.push(activityName + " with " + partnerName);
\t\t\t}
\t\t}
\t}
\tif (conflicts.length > 0) {
\t\treturn ' <span class="red">(Conflict: ' + conflicts.join(", ") + ')</span>';
\t}
\treturn "";
}

setup.count_dates_planned_for_day = function(day = V.gameday)"""

content = content.replace("setup.count_dates_planned_for_day = function(day = V.gameday)", helper_function)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
