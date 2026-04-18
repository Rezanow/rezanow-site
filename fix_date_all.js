const fs = require('fs');
let html = fs.readFileSync('CourseOfTemptation.html', 'utf8');

// Also remove from PhoneTextMenu and put it into the widget
html = html.replace(`</tw-passagedata><tw-passagedata pid="381" name="PhoneTextMenu" tags="widget nobr" position="100,4850" size="100,100">
&lt;&lt;if !$proposeddate&gt;&gt;
&lt;&lt;set $proposeddate to {partner: $phonetexter}&gt;&gt;
&lt;&lt;/if&gt;&gt;
&lt;&lt;widget &quot;phonetextmenu&quot;&gt;&gt;`, `</tw-passagedata><tw-passagedata pid="381" name="PhoneTextMenu" tags="widget nobr" position="100,4850" size="100,100">&lt;&lt;widget &quot;phonetextmenu&quot;&gt;&gt;
&lt;&lt;if !$proposeddate&gt;&gt;
&lt;&lt;set $proposeddate to {partner: $phonetexter}&gt;&gt;
&lt;&lt;/if&gt;&gt;`);

fs.writeFileSync('CourseOfTemptation.html', html, 'utf8');
