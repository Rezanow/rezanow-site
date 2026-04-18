import re

file_path = "CourseOfTemptation.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Using find index.
start_str = "&lt;&lt;set _hour to $proposeddate.time gt 12 ? $proposeddate.time - 12 : $proposeddate.time&gt;&gt;"
start_idx = content.find(start_str, content.find('name="InPersonDialogueHangoutPlanningTime"'))

never_mind_idx = content.find('&lt;&lt;link &quot;Never mind&quot; InPersonDialogueOngoing&gt;&gt;', start_idx)
end_idx = content.find('&lt;&lt;/link&gt;&gt;', never_mind_idx) + len('&lt;&lt;/link&gt;&gt;')

if start_idx == -1 or never_mind_idx == -1 or end_idx == -1:
    print("Cannot find bounds")
else:
    print(f"Found bounds! start: {start_idx}, never_mind: {never_mind_idx}, end: {end_idx}")

    replacement = r"""<<set _hour to $proposeddate.time gt 12 ? $proposeddate.time - 12 : $proposeddate.time>>
    <<for _i to 0; _i lt 5; _i++>>
        <<if _i eq 0 and $hour gte _todayhour>>
            <<continue>>
        <</if>>
        <<set _targetday to $gameday + _i>>
        <<set _daylink to (_i eq 0 ? _todaylink : _i eq 1 ? _tomorrowlink : setup.Time.weekday(V.day + _i))>>
        <<set _conflictstr to setup.get_date_conflict_string(_targetday, $proposeddate.time, $proposeddate.endtime)>>
        <<capture _i, _targetday, _daylink>>
        <<link `_daylink + _conflictstr` InPersonDialogueOngoing>>
            <<set $proposeddate.day to _targetday>>
            <<set _activityresponse to setup.Relationships.react_to_activity_proposal($proposeddate.partner, $proposeddate.type, _activityinfo, $proposeddate.day)>>
            <<if !_activityresponse[0]>>
                <<set $header to '<<anonorfirstnamec $eventnpc>> considers. "' + _activityresponse[1] + '."'>>
            <<else>>
                <<if _i eq 0>>
                    <<if $hour gte _todayhour and $hour lt $proposeddate.endtime>>
                        <<set $header to '<<anonorfirstnamec $eventnpc>> considers. "Short notice but... sure, I\'m not doing much. '>>
                    <<else>>
                        <<set $header to '<<anonorfirstnamec $eventnpc>> considers. "Sure, I can do it anytime after ' + _hour + '. '>>
                    <</if>>
                <<elseif _i eq 1>>
                    <<set $header to '<<anonorfirstnamec $eventnpc>> says, "Sounds great, I\'m free anytime after ' + _hour + '. '>>
                <<else>>
                    <<set $header to '<<anonorfirstnamec $eventnpc>> says, "' + _daylink + ' it is! Let\'s plan for sometime after ' + _hour + '. '>>
                <</if>>
                <<set _msg to $proposeddate.locmsg>>
                <<if !/[!.,?]$/.test(_msg)>>
                    <<set _msg += ".">>
                <</if>>
                <<set $header += _msg + '"  <<getnumber $eventnpc>>'>>
                <<if !$planneddate>>
                    <<set $planneddate to [$proposeddate]>>
                <<else>>
                    <<run $planneddate.push($proposeddate)>>
                <</if>>
            <</if>>
            <<unset $proposeddate>>
        <</link>><br>
        <</capture>>
    <</for>>
    <<link "Never mind" InPersonDialogueOngoing>>
        <<set $header to "On second thought, you'll probably be busy. You ask <<po $eventnpc>> to forget you said anything.">>
        <<unset $proposeddate>>
    <</link>>"""

    # Replace Twine bracket pairs with html entities to match the surrounding file
    replacement = replacement.replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#39;")

    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Patched successfully")
