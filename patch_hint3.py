import sys

with open("CourseOfTemptation.html", "r", encoding="utf-8") as f:
    lines = f.readlines()

def patch_lines(lines):
    patched_partner1 = False
    patched_open1 = False
    patched_poly1 = False
    patched_sub1 = False
    patched_sub2 = False
    patched_dom1 = False
    patched_dom2 = False

    in_partner = False
    in_open = False
    in_poly = False
    in_sub_passage = False
    in_dom_passage = False

    out_lines = []

    i = 0
    while i < len(lines):
        line = lines[i]

        if "name=\"EventPlayerInitDiscussRelationshipPartner\"" in line:
            in_partner = True
        elif "name=\"EventPlayerInitDiscussRelationshipOpenPartner\"" in line:
            in_partner = False
            in_open = True
        elif "name=\"EventPlayerInitDiscussRelationshipPolyPartner\"" in line:
            in_open = False
            in_poly = True
        elif "name=\"EventPlayerInitDiscussRelationshipSub\"" in line:
            in_poly = False
            in_sub_passage = True
        elif "name=\"EventPlayerInitDiscussRelationshipDom\"" in line:
            in_sub_passage = False
            in_dom_passage = True

        out_lines.append(line)

        if in_partner:
            if "Your heart sinks, but you nod, accepting it. What else can you do?" in line and not patched_partner1:
                hint_str = """    &lt;&lt;hint&gt;&gt;
        To become their partner, they need to be ready to date you:
        &lt;&lt;if setup.people.get_type($eventnpc) is "faculty"&gt;&gt;They are a faculty member, so they will not date a student.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !$bonuspartner and setup.Relationships.in_exclusive_relationship($eventnpc)&gt;&gt;They are already in an exclusive relationship.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !_repcheck[0]&gt;&gt;They won't date you because of your reputation: &lt;&lt;=_repcheck[1]&gt;&gt;.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "romance") lte 400 and setup.people.get_attitude($eventnpc, "lust") lte 400&gt;&gt;Their Romance or Lust needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "romance") lte 400 and setup.people.get_attitude($eventnpc, "friendship") lte 400&gt;&gt;Their Romance or Friendship needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;set _desrel to setup.people.desired_relationship($eventnpc, false)&gt;&gt;
        &lt;&lt;if ["rival", "indifferent", "acquaintance"].includes(_desrel)&gt;&gt;They don't currently desire a relationship with you (Desired Relationship: &lt;&lt;=_desrel&gt;&gt;).&lt;br&gt;&lt;&lt;/if&gt;&gt;
    &lt;&lt;/hint&gt;&gt;\n"""
                out_lines.append(hint_str)
                patched_partner1 = True

        elif in_open:
            if "Your heart sinks, but you nod, accepting it. What else can you do?" in line and not patched_open1:
                hint_str = """    &lt;&lt;hint&gt;&gt;
        To become their open partner, they need to be ready to date you:
        &lt;&lt;if setup.people.get_type($eventnpc) is "faculty"&gt;&gt;They are a faculty member, so they will not date a student.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !$bonuspartner and setup.Relationships.in_exclusive_relationship($eventnpc)&gt;&gt;They are already in an exclusive relationship.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !_repcheck[0]&gt;&gt;They won't date you because of your reputation: &lt;&lt;=_repcheck[1]&gt;&gt;.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "romance") lte 400 and setup.people.get_attitude($eventnpc, "lust") lte 400&gt;&gt;Their Romance or Lust needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "romance") lte 400 and setup.people.get_attitude($eventnpc, "friendship") lte 400&gt;&gt;Their Romance or Friendship needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;set _desrel to setup.people.desired_relationship($eventnpc, false)&gt;&gt;
        &lt;&lt;if ["rival", "indifferent", "acquaintance"].includes(_desrel)&gt;&gt;They don't currently desire a relationship with you (Desired Relationship: &lt;&lt;=_desrel&gt;&gt;).&lt;br&gt;&lt;&lt;/if&gt;&gt;
    &lt;&lt;/hint&gt;&gt;\n"""
                out_lines.append(hint_str)
                patched_open1 = True

        elif in_poly:
            if "Your heart sinks, but you nod, accepting it. What else can you do?" in line and not patched_poly1:
                hint_str = """    &lt;&lt;hint&gt;&gt;
        To become their polyamorous partner, they need to be ready to date you:
        &lt;&lt;if setup.people.get_type($eventnpc) is "faculty"&gt;&gt;They are a faculty member, so they will not date a student.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !$bonuspartner and setup.Relationships.in_exclusive_relationship($eventnpc)&gt;&gt;They are already in an exclusive relationship.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !_repcheck[0]&gt;&gt;They won't date you because of your reputation: &lt;&lt;=_repcheck[1]&gt;&gt;.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "romance") lte 400 and setup.people.get_attitude($eventnpc, "lust") lte 400&gt;&gt;Their Romance or Lust needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "romance") lte 400 and setup.people.get_attitude($eventnpc, "friendship") lte 400&gt;&gt;Their Romance or Friendship needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;set _desrel to setup.people.desired_relationship($eventnpc, false)&gt;&gt;
        &lt;&lt;if ["rival", "indifferent", "acquaintance"].includes(_desrel)&gt;&gt;They don't currently desire a relationship with you (Desired Relationship: &lt;&lt;=_desrel&gt;&gt;).&lt;br&gt;&lt;&lt;/if&gt;&gt;
    &lt;&lt;/hint&gt;&gt;\n"""
                out_lines.append(hint_str)
                patched_poly1 = True

        elif in_sub_passage:
            if "Well... that didn&#39;t work." in line and not patched_sub1:
                hint_str = """    &lt;&lt;hint&gt;&gt;
        To become their dominant, they need to be ready to submit to you:
        &lt;&lt;if !setup.people.has_any_inclination($eventnpc, "submissive")&gt;&gt;They don't have a submissive personality.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "lust") lte 400 and setup.people.get_attitude($eventnpc, "romance") lte 400&gt;&gt;Their Lust or Romance needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "lust") lte 400 and setup.people.get_attitude($eventnpc, "friendship") lte 400&gt;&gt;Their Lust or Friendship needs to be higher (at least 40%). (Note: High friendship alone isn't enough, it must be paired with high lust or romance.)&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "control") gte -50&gt;&gt;They don't feel submitted to you enough (Control needs to be below -5%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !setup.people.is_sexpartner($eventnpc)&gt;&gt;You need to have slept with them first.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;set _desrel to setup.people.desired_relationship($eventnpc, false)&gt;&gt;
        &lt;&lt;if ["friend", "rival", "indifferent", "acquaintance"].includes(_desrel)&gt;&gt;They don't currently desire a romantic or sexual relationship with you (Desired Relationship: &lt;&lt;=_desrel&gt;&gt;).&lt;br&gt;&lt;&lt;/if&gt;&gt;
    &lt;&lt;/hint&gt;&gt;\n"""
                out_lines.append(hint_str)
                patched_sub1 = True
            elif "Well... that didn&#39;t work." in line and patched_sub1 and not patched_sub2:
                hint_str = """    &lt;&lt;hint&gt;&gt;
        To become their dominant, &lt;&lt;firstname $bonuspartner&gt;&gt; needs to be ready to submit to you:
        &lt;&lt;if !setup.people.has_any_inclination($bonuspartner, "submissive")&gt;&gt;They don't have a submissive personality.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($bonuspartner, "lust") lte 400 and setup.people.get_attitude($bonuspartner, "romance") lte 400&gt;&gt;Their Lust or Romance needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($bonuspartner, "lust") lte 400 and setup.people.get_attitude($bonuspartner, "friendship") lte 400&gt;&gt;Their Lust or Friendship needs to be higher (at least 40%). (Note: High friendship alone isn't enough, it must be paired with high lust or romance.)&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($bonuspartner, "control") gte -50&gt;&gt;They don't feel submitted to you enough (Control needs to be below -5%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !setup.people.is_sexpartner($bonuspartner)&gt;&gt;You need to have slept with them first.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;set _desrel to setup.people.desired_relationship($bonuspartner, false)&gt;&gt;
        &lt;&lt;if ["friend", "rival", "indifferent", "acquaintance"].includes(_desrel)&gt;&gt;They don't currently desire a romantic or sexual relationship with you (Desired Relationship: &lt;&lt;=_desrel&gt;&gt;).&lt;br&gt;&lt;&lt;/if&gt;&gt;
    &lt;&lt;/hint&gt;&gt;\n"""
                out_lines.append(hint_str)
                patched_sub2 = True

        elif in_dom_passage:
            if "Well, that didn&#39;t work out." in line and not patched_dom1:
                hint_str = """    &lt;&lt;hint&gt;&gt;
        To become their submissive, they need to be ready to dominate you:
        &lt;&lt;if !setup.people.has_any_inclination($eventnpc, "dominant")&gt;&gt;They don't have a dominant personality.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "lust") lte 400 and setup.people.get_attitude($eventnpc, "romance") lte 400&gt;&gt;Their Lust or Romance needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "lust") lte 400 and setup.people.get_attitude($eventnpc, "friendship") lte 400&gt;&gt;Their Lust or Friendship needs to be higher (at least 40%). (Note: High friendship alone isn't enough, it must be paired with high lust or romance.)&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($eventnpc, "control") lte 50&gt;&gt;They don't feel dominant enough over you (Control needs to be above 5%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !setup.people.is_sexpartner($eventnpc)&gt;&gt;You need to have slept with them first.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;set _desrel to setup.people.desired_relationship($eventnpc, false)&gt;&gt;
        &lt;&lt;if ["friend", "rival", "indifferent", "acquaintance"].includes(_desrel)&gt;&gt;They don't currently desire a romantic or sexual relationship with you (Desired Relationship: &lt;&lt;=_desrel&gt;&gt;).&lt;br&gt;&lt;&lt;/if&gt;&gt;
    &lt;&lt;/hint&gt;&gt;\n"""
                out_lines.append(hint_str)
                patched_dom1 = True
            elif "Well, that didn&#39;t work out." in line and patched_dom1 and not patched_dom2:
                hint_str = """    &lt;&lt;hint&gt;&gt;
        To become their submissive, &lt;&lt;firstname $bonuspartner&gt;&gt; needs to be ready to dominate you:
        &lt;&lt;if !setup.people.has_any_inclination($bonuspartner, "dominant")&gt;&gt;They don't have a dominant personality.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($bonuspartner, "lust") lte 400 and setup.people.get_attitude($bonuspartner, "romance") lte 400&gt;&gt;Their Lust or Romance needs to be higher (at least 40%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($bonuspartner, "lust") lte 400 and setup.people.get_attitude($bonuspartner, "friendship") lte 400&gt;&gt;Their Lust or Friendship needs to be higher (at least 40%). (Note: High friendship alone isn't enough, it must be paired with high lust or romance.)&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if setup.people.get_attitude($bonuspartner, "control") lte 50&gt;&gt;They don't feel dominant enough over you (Control needs to be above 5%).&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;if !setup.people.is_sexpartner($bonuspartner)&gt;&gt;You need to have slept with them first.&lt;br&gt;&lt;&lt;/if&gt;&gt;
        &lt;&lt;set _desrel to setup.people.desired_relationship($bonuspartner, false)&gt;&gt;
        &lt;&lt;if ["friend", "rival", "indifferent", "acquaintance"].includes(_desrel)&gt;&gt;They don't currently desire a romantic or sexual relationship with you (Desired Relationship: &lt;&lt;=_desrel&gt;&gt;).&lt;br&gt;&lt;&lt;/if&gt;&gt;
    &lt;&lt;/hint&gt;&gt;\n"""
                out_lines.append(hint_str)
                patched_dom2 = True

        i += 1

    return out_lines

lines = patch_lines(lines)

with open("CourseOfTemptation.html", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Patched.")
