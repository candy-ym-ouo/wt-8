-- 初始化常用驳回模板
INSERT OR IGNORE INTO "RejectTemplate" ("title", "content", "category", "sortOrder", "isActive", "isGlobal", "createdAt", "updatedAt") VALUES
('内容质量不达标', '您的投稿内容质量未达到平台发布标准，建议补充更多原创内容和个人观点，提升文章的深度和可读性。如有疑问可联系编辑团队咨询。', 'CONTENT', 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('主题不适合本站', '您的投稿主题与本站定位不符，本站主要收录文学创作、艺术插画、生活美学等方向的内容，建议您选择更适合的平台投稿。', 'THEME', 2, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('格式排版问题', '您的投稿存在格式排版问题，建议调整段落结构、添加适当的小标题和分隔，确保阅读体验流畅。可参考站内优秀作品的排版方式。', 'FORMAT', 3, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('涉及敏感内容', '您的投稿内容涉及敏感话题，不符合平台内容规范，请修改后重新投稿。如有疑问可查看《社区公约》或联系客服咨询。', 'VIOLATION', 4, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('原创性存疑', '您的投稿内容原创性存疑，可能包含大量引用或转载内容。请确保投稿为本人原创，并注明引用来源。如系转载，请获得授权后再投稿。', 'ORIGINALITY', 5, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('图片/附件问题', '您的投稿图片质量不佳或缺少必要的配图，建议添加高质量的原创图片，确保图文并茂。如使用网络图片，请确保获得授权。', 'MEDIA', 6, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('字数不足', '您的投稿字数较少，内容不够充实。建议补充更多细节、案例或个人感悟，使文章内容更加丰满完整。', 'CONTENT', 7, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('标题需要优化', '您的投稿标题不够吸引人或未能准确反映文章内容，建议优化标题，使其更具吸引力同时概括文章主题。', 'FORMAT', 8, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
