UPDATE locale_resource
SET value = '오답 · 내 선택 {selected}'
WHERE locale = 'ko' AND resource_key = 'feedback.wrong';
