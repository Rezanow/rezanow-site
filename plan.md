`setup.Time.weekday(day)` takes `$day`, which seems to track the overall day (starting from 1). Wait, `day = V.day`.
What happens if we do `setup.Time.weekday(V.day + _i)`?
In Twine, `$day` is the day counter.
Let's check the implementation of `setup.Time.weekday`:
```javascript
setup.Time.weekday = function(day = V.day)
{
    day -= 1;
    while (day > 6) day -= 7;
    return this.day_of_week[day];
}
```
Yes! It will perfectly wrap if we pass `$day + _i`.
So we can definitely use `setup.Time.weekday($day + _i)` (or `setup.Time.weekday(V.day + _i)`).

The plan:
1. Define `setup.get_date_conflict_string(day, time, endtime)` in the JS section of `CourseOfTemptation.html`.
2. Rewrite `InPersonDialogueHangoutPlanningTime` logic.
3. Rewrite `PhoneTextingHangout` planning time logic.

Let's do it!
