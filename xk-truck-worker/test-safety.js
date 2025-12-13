/**
 * AI 安全功能测试脚本
 * 测试敏感问题检测和安全回复
 */

const API_URL = process.env.API_URL || 'https://xk-truck-api.harry-zhang592802.workers.dev';

const testCases = [
  {
    name: '价格询问（敏感）',
    message: 'VOLVO 大灯多少钱？',
    expectSafe: true,
    description: '应该返回安全回复，引导联系'
  },
  {
    name: 'Price inquiry (sensitive)',
    message: 'How much is the VOLVO headlamp?',
    expectSafe: true,
    description: 'Should return safe reply'
  },
  {
    name: 'OE 编号询问（敏感）',
    message: 'OE number 1234567 的规格是什么？',
    expectSafe: true,
    description: '应该返回安全回复'
  },
  {
    name: '质保询问（敏感）',
    message: 'What is your warranty policy?',
    expectSafe: true,
    description: 'Should return safe reply'
  },
  {
    name: '运输询问（敏感）',
    message: '运输到美国需要多久？',
    expectSafe: true,
    description: '应该返回安全回复'
  },
  {
    name: '库存询问（敏感）',
    message: 'Do you have VOLVO mirrors in stock?',
    expectSafe: true,
    description: 'Should return safe reply'
  },
  {
    name: '一般询问（安全）',
    message: '你们有 VOLVO 配件吗？',
    expectSafe: false,
    description: '可以让 AI 自由回答'
  },
  {
    name: '公司信息（安全）',
    message: 'Where is your factory?',
    expectSafe: false,
    description: '可以让 AI 自由回答'
  },
  {
    name: '产品分类（安全）',
    message: 'What products do you offer?',
    expectSafe: false,
    description: '可以让 AI 自由回答'
  }
];

async function testSafety() {
  console.log('========================================');
  console.log('🛡️  AI 安全功能测试');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 测试: ${testCase.name}`);
    console.log(`   消息: "${testCase.message}"`);
    console.log(`   期望: ${testCase.expectSafe ? '安全回复' : 'AI 自由回答'}`);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: testCase.message,
          sessionId: `test-${Date.now()}`
        })
      });

      const result = await response.json();

      if (!result.success) {
        console.log(`   ❌ 失败: ${result.error}`);
        failed++;
        continue;
      }

      // 只有 safeMode 为 true 才算安全回复（代码层拦截）
      // 如果 AI 正常回答但提到了联系方式，那是正常的
      const isSafeReply = result.safeMode === true;

      if (testCase.expectSafe === isSafeReply) {
        console.log(`   ✅ 通过`);
        console.log(`   回复: ${result.reply.substring(0, 100)}...`);
        passed++;
      } else {
        console.log(`   ❌ 失败`);
        console.log(`   期望: ${testCase.expectSafe ? '安全回复' : 'AI 回答'}`);
        console.log(`   实际: ${isSafeReply ? '安全回复' : 'AI 回答'}`);
        console.log(`   回复: ${result.reply.substring(0, 100)}...`);
        failed++;
      }

      // 显示调试信息（如果有）
      if (result.debug) {
        console.log(`   调试: 搜索方式=${result.debug.searchMethod}, 知识库=${result.debug.knowledgeCount}条`);
      }

    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
      failed++;
    }

    // 延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n========================================');
  console.log('📊 测试结果');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 通过率: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log('========================================\n');

  if (failed === 0) {
    console.log('🎉 所有测试通过！AI 安全功能工作正常。\n');
  } else {
    console.log('⚠️  部分测试失败，请检查配置和代码。\n');
  }
}

// 运行测试
testSafety().catch(console.error);
