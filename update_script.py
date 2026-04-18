import re

file_path = "CourseOfTemptation.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace logic in InPersonDialogueHangoutPlanningTime
search_str = """    <<set _weekday to setup.Time.weekday()>>
    <<set _plusweekday to ["Friday", "Thursday", "Wednesday", "Tuesday", "Monday"].indexOf(_weekday)>>
    <<if ["Monday", "Tuesday", "Wednesday"].includes(_weekday) and setup.count_dates_planned_for_day($gameday + _plusweekday) lt 3>>
        <<link "Friday" InPersonDialogueOngoing>>
            <<set $proposeddate.day to $gameday + _plusweekday>>"""
