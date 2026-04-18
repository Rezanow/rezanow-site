setup.get_date_conflict_string = function(day, time, endtime) {
    if (!V.planneddate) return "";
    let conflicts = [];
    for (const date of V.planneddate) {
        if (date.day == day) {
            let d_time = date.time || 0;
            let d_endtime = date.endtime || 24;
            if (time < d_endtime && endtime > d_time) {
                let partnerName = date.partner ? (setup.people.can_identify_name(date.partner) ? setup.people.firstname(date.partner) : "someone") : "someone";
                let activityName = date.activity ? date.activity : "hangout";
                conflicts.push(activityName + " with " + partnerName);
            }
        }
    }
    if (conflicts.length > 0) {
        return " <span class='red'>(Conflict: " + conflicts.join(", ") + ")</span>";
    }
    return "";
}
