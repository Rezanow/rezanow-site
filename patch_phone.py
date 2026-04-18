import re

file_path = "CourseOfTemptation.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_str = "&lt;&lt;case &quot;hangout time&quot;&gt;&gt;"
start_idx = content.find(start_str)

end_str = "&lt;&lt;case &quot;send selfie&quot;&gt;&gt;"
end_idx = content.find(end_str, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Cannot find bounds")
else:
    print(f"Found bounds! start: {start_idx}, end: {end_idx}")

    replacement = r"""<<case "hangout time">>
                        /* HANGOUT TIME */
                        <<set _foundday to false>>
                        <<set _hour to ($proposeddate.time gt 12 ? $proposeddate.time - 12 : $proposeddate.time)>>
                        <<for _i to 0; _i lt 5; _i++>>
                            <<if _i eq 0 and $hour gte _todayhour>>
                                <<continue>>
                            <</if>>
                            <<set _targetday to $gameday + _i>>
                            <<set _daylink to (_i eq 0 ? _todaylink : _i eq 1 ? _tomorrowlink : setup.Time.weekday(V.day + _i))>>
                            <<set _conflictstr to setup.get_date_conflict_string(_targetday, $proposeddate.time, $proposeddate.endtime)>>
                            <<capture _i, _targetday, _daylink>>
                            <<set _foundday to true>>
                            <<phonelink `_daylink + _conflictstr`>>
                                <<set _todaysend to _i eq 0 ? _todaysend : _i eq 1 ? "how about tomorrow" : "let's do it " + setup.Time.weekday(V.day + _i).toLowerCase()>>
                                <<addphonesend _todaysend>>
                                <<set $proposeddate.day to _targetday>>
                                <<set _activityresponse to setup.Relationships.react_to_activity_proposal($proposeddate.partner, $proposeddate.type, $proposeddate.activity, $proposeddate.day)>>
                                <<if !_activityresponse[0]>>
                                    <<set _msg to setup.people.text_msg($phonetexter, _activityresponse[1])>>
                                <<else>>
                                    <<if _i eq 0>>
                                        <<if $hour gte _todayhour and $hour lt $proposeddate.endtime>>
                                            <<run _msg.unshift(setup.phone.get_response($proposeddate.partner, "short notice now"))>>
                                        <<else>>
                                            <<run _msg.unshift(setup.phone.get_response($proposeddate.partner, "short notice later").replace("%hour", _hour.toString()))>>
                                        <</if>>
                                    <<elseif _i eq 1>>
                                        <<run _msg.unshift(setup.phone.get_response($proposeddate.partner, "agree tomorrow").replace("%hour", _hour.toString()))>>
                                    <<else>>
                                        <<set _agreemsg to setup.phone.get_response($proposeddate.partner, "agree " + setup.Time.weekday(V.day + _i).toLowerCase())>>
                                        <<if !_agreemsg>><<set _agreemsg to setup.phone.get_response($proposeddate.partner, "agree tomorrow")>><</if>>
                                        <<run _msg.unshift(_agreemsg.replace("%hour", _hour.toString()))>>
                                    <</if>>
                                    <<run _msg.push($proposeddate.locmsg)>>
                                    <<set _msg to setup.people.text_msg($proposeddate.partner, _msg)>>
                                    <<if !$planneddate>>
                                        <<set $planneddate to [$proposeddate]>>
                                    <<else>>
                                        <<run $planneddate.push($proposeddate)>>
                                    <</if>>
                                <</if>>
                                <<addphonereceive _msg>>
                                <<phonetextrefresh>>
                                <<unset $proposeddate>>
                            <</phonelink>><br>
                            <</capture>>
                        <</for>>
                        <<if !_foundday>>
                            <<phonelink "You're overbooked..." PhonePlanningOverbooked>>
                                <<unset $proposeddate>>
                                <<run setup.close_dialog()>>
                            <</phonelink>>
                        <</if>>
                    """

    replacement = replacement.replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#39;")
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Patched successfully")
