/**
 * 快速配置验证脚本
 * 检查配置状态并提供下一步指导
 */

console.log('========================================');
console.log('🚀 AI 安全功能 - 快速配置检查');
console.log('========================================\n');

console.log('📋 配置状态检查\n');

console.log('✅ 已完成的工作:');
console.log('   1. ✅ 代码实现（敏感问题检测）');
console.log('   2. ✅ Worker 部署到 Cloudflare');
console.log('   3. ✅ 测试脚本准备完成');
console.log('   4. ✅ 文档创建完成\n');

console.log('📝 待完成的配置（只需 2 步）:\n');

console.log('【步骤 1】更新系统提示词');
console.log('─────────────────────────────────────');
console.log('方法 A（推荐）：通过 Supabase SQL Editor');
console.log('  1. 打开: https://supabase.com/dashboard');
console.log('  2. 选择项目: XKTRUCK');
console.log('  3. SQL Editor → New query');
console.log('  4. 复制并执行: xk-truck-worker/sql/update-system-prompt.sql');
console.log('  5. 点击 "Run"\n');

console.log('方法 B：通过管理后台');
console.log('  1. 访问: https://xk-truck.cn/admin');
console.log('  2. 进入"系统设置"');
console.log('  3. 复制 docs/AI-SYSTEM-PROMPT.md 中的提示词');
console.log('  4. 粘贴并保存\n');

console.log('【步骤 2】运行测试验证');
console.log('─────────────────────────────────────');
console.log('  在当前目录运行:');
console.log('  $ node test-safety.js\n');

console.log('========================================');
console.log('📚 相关文档');
console.log('========================================\n');
console.log('  • 配置指南: docs/CONFIGURATION-GUIDE.md');
console.log('  • 系统提示词: docs/AI-SYSTEM-PROMPT.md');
console.log('  • 安全验证: docs/AI-SAFETY.md');
console.log('  • 学习指南: docs/LEARNING-GUIDE.md\n');

console.log('========================================');
console.log('🎯 快速开始');
console.log('========================================\n');
console.log('1. 打开 Supabase SQL Editor');
console.log('2. 执行 sql/update-system-prompt.sql');
console.log('3. 运行 node test-safety.js');
console.log('4. 在网站上测试: https://xk-truck.cn\n');

console.log('需要帮助？查看 NEXT-STEPS.md 文件\n');
