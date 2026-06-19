def extract_skills(jd_text):
    keywords = [
        "python", "java", "c++", "mysql",
        "linux", "network", "security",
        "sql", "windows", "macos"
    ]

    found = []
    jd_text = jd_text.lower()

    for skill in keywords:
        if skill in jd_text:
            found.append(skill)

    return found