/**
 * マイルストーントラッカー - ★9統合テスト成功請負人が活用する処理時間計測ユーティリティ
 * 
 * このユーティリティは、統合テストの実行時間を詳細に計測し、
 * パフォーマンスの問題やボトルネックを特定するために使用されます。
 */
class MilestoneTracker {
  constructor(testName = '統合テスト') {
    this.testName = testName;
    this.milestones = {};
    this.startTime = Date.now();
    this.currentOp = '初期化';
    this.operations = [];
    
    console.log(`[${this.getElapsed()}] 🚀 ${this.testName} 開始`);
  }

  // 操作の設定と開始
  setOperation(op) {
    if (this.currentOp !== '初期化') {
      // 前の操作の終了時間を記録
      this.operations.push({
        name: this.currentOp,
        startTime: this.operationStartTime || this.startTime,
        endTime: Date.now()
      });
    }
    
    this.currentOp = op;
    this.operationStartTime = Date.now();
    console.log(`[${this.getElapsed()}] ▶️ 開始: ${op}`);
  }

  // マイルストーンの記録
  mark(name) {
    const timestamp = Date.now();
    this.milestones[name] = timestamp;
    console.log(`[${this.getElapsed()}] 🏁 ${name}`);
    
    // 現在の操作に関連付け
    if (this.currentOp && this.currentOp !== '初期化') {
      this.milestones[`${this.currentOp}:${name}`] = timestamp;
    }
  }

  // エラー記録
  markError(operation, error) {
    const timestamp = Date.now();
    console.log(`[${this.getElapsed()}] ❌ エラー発生: ${operation}`);
    console.log(`[${this.getElapsed()}] エラー詳細:`, error.message);
    
    this.milestones[`ERROR:${operation}`] = timestamp;
  }

  // 成功記録
  markSuccess(operation, details = '') {
    const timestamp = Date.now();
    const detailsStr = details ? ` (${details})` : '';
    console.log(`[${this.getElapsed()}] ✅ 成功: ${operation}${detailsStr}`);
    
    this.milestones[`SUCCESS:${operation}`] = timestamp;
  }

  // 警告記録
  markWarning(operation, message) {
    const timestamp = Date.now();
    console.log(`[${this.getElapsed()}] ⚠️ 警告: ${operation} - ${message}`);
    
    this.milestones[`WARNING:${operation}`] = timestamp;
  }

  // 詳細分析結果の表示（★9のデバッグで重要）
  summary() {
    // 現在の操作も完了として記録
    if (this.currentOp !== '初期化') {
      this.operations.push({
        name: this.currentOp,
        startTime: this.operationStartTime || this.startTime,
        endTime: Date.now()
      });
    }

    const totalTime = (Date.now() - this.startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 ${this.testName} - 詳細実行時間分析`);
    console.log('='.repeat(60));
    
    // 操作別の実行時間分析
    if (this.operations.length > 0) {
      console.log('\n🔍 操作別実行時間:');
      this.operations.forEach((op, index) => {
        const duration = (op.endTime - op.startTime) / 1000;
        const percentage = ((duration / totalTime) * 100).toFixed(1);
        console.log(`  ${index + 1}. ${op.name}: ${duration.toFixed(2)}秒 (${percentage}%)`);
      });
    }

    // マイルストーン間の時間差分析
    console.log('\n⏱️ マイルストーン詳細:');
    const sortedMilestones = Object.entries(this.milestones)
      .sort((a, b) => a[1] - b[1]);
    
    for (let i = 0; i < sortedMilestones.length; i++) {
      const [name, timestamp] = sortedMilestones[i];
      const absoluteTime = ((timestamp - this.startTime) / 1000).toFixed(2);
      
      if (i > 0) {
        const prevTimestamp = sortedMilestones[i - 1][1];
        const diff = ((timestamp - prevTimestamp) / 1000).toFixed(2);
        console.log(`  📌 ${name}: +${diff}秒 (累計: ${absoluteTime}秒)`);
      } else {
        console.log(`  📌 ${name}: ${absoluteTime}秒`);
      }
    }

    // パフォーマンス分析
    console.log('\n🎯 パフォーマンス分析:');
    console.log(`  • 総実行時間: ${totalTime.toFixed(2)}秒`);
    
    if (totalTime > 10) {
      console.log('  ⚠️ 長時間実行 - パフォーマンス最適化を検討してください');
    } else if (totalTime > 5) {
      console.log('  ⚡ 中程度の実行時間 - 許容範囲内');
    } else {
      console.log('  🚀 高速実行 - 良好なパフォーマンス');
    }

    // エラー・警告の集計
    const errors = sortedMilestones.filter(([name]) => name.startsWith('ERROR:')).length;
    const warnings = sortedMilestones.filter(([name]) => name.startsWith('WARNING:')).length;
    const successes = sortedMilestones.filter(([name]) => name.startsWith('SUCCESS:')).length;

    if (errors > 0 || warnings > 0 || successes > 0) {
      console.log('\n📈 実行結果サマリー:');
      if (successes > 0) console.log(`  ✅ 成功: ${successes}件`);
      if (warnings > 0) console.log(`  ⚠️ 警告: ${warnings}件`);
      if (errors > 0) console.log(`  ❌ エラー: ${errors}件`);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    return {
      totalTime,
      operations: this.operations.length,
      milestones: Object.keys(this.milestones).length,
      errors,
      warnings,
      successes
    };
  }

  // 経過時間の取得（フォーマット済み）
  getElapsed() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return `${elapsed.toFixed(2)}秒`;
  }

  // リセット
  reset(testName = null) {
    if (testName) this.testName = testName;
    this.milestones = {};
    this.operations = [];
    this.startTime = Date.now();
    this.currentOp = '初期化';
    this.operationStartTime = null;
    
    console.log(`[00.00秒] 🔄 ${this.testName} リセット完了`);
  }

  // 中間報告
  checkpoint(name) {
    this.mark(`CHECKPOINT:${name}`);
    const elapsed = this.getElapsed();
    console.log(`[${elapsed}] 🔍 中間確認: ${name}`);
    return elapsed;
  }
}

module.exports = MilestoneTracker;