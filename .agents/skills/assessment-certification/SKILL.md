---
name: assessment-certification
description: >-
  Rules and procedures for the examination quiz engine, countdown timers, HMAC anti-tamper signing, and vector PDF certificate generation via pdf-lib.
---

# Assessment & Offline Certification Skill

## Quiz Engine Specifications
1. **Rules**:
   - Timed countdown timer per quiz.
   - Passing threshold (e.g. 80%).
   - Option shuffling and immediate review feedback with teacher explanations.
2. **Anti-Tamper HMAC Signing**:
   - Every submitted attempt is signed with HMAC-SHA256 (`usr_student:quizId:score:timestamp`) stored in SQLite to prevent manual grade tampering.

## Certificate Generation via pdf-lib
- When all mandatory modules and quizzes are passed, generate a vector PDF certificate.
- Embed student name, course title, completion date, official Infinyt 3D branding, and the cryptographic verification hash.
