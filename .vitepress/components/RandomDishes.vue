<template>
  <div class="dish-container">
    <!-- 标题与操作区 -->
    <div class="header">
      <h2>今日推荐：{{ dishList.length }}道菜（{{ soupCount }}汤{{ dishCount }}菜）</h2>
      <div class="header-btns">
        <button @click="regenerateAll" class="btn primary">重新生成全部（四菜一汤）</button>
        <button @click="exportReadme" class="btn success" :disabled="dishList.length === 0">
          {{ exportLoading ? "导出中..." : "导出菜品详情README" }}
        </button>
      </div>
    </div>

    <!-- 加菜控制区 -->
    <div class="add-controls">
      <div class="add-type">
        <button @click="addDish('菜')" class="btn secondary" :disabled="isMaxDish">
          加一道菜（当前{{ dishCount }}道）
        </button>
        <button @click="addDish('汤')" class="btn secondary" :disabled="isMaxSoup">
          加一道汤（当前{{ soupCount }}道）
        </button>
      </div>
      <div class="add-category">
        <select v-model="selectedCategory" class="category-select">
          <option value="">选择类别添加菜品</option>
          <option v-for="cat in allCategories" :key="cat">{{ cat }}</option>
        </select>
        <button
            @click="addCategoryDish"
            class="btn secondary"
            :disabled="!selectedCategory || !hasCategoryDish"
        >
          添加此类别菜品
        </button>
      </div>
    </div>

    <!-- 菜品列表（带单菜重随机、删除） -->
    <div class="dish-list">
      <div class="dish-card" v-for="(dish, index) in dishList" :key="dish.link">
        <div class="dish-info">
          <span class="dish-tag">{{ dish.type }}</span>
          <span class="dish-category">[{{ dish.category }}]</span>
          <a :href="dish.link" target="_blank" class="dish-name">{{ dish.name }}</a>
        </div>
        <div class="dish-actions">
          <button @click="regenerateSingle(index)" class="btn mini">重随机</button>
          <button @click="removeDish(index)" class="btn mini danger" :disabled="dishList.length <= 2">
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="tips" v-if="tipsText">{{ tipsText }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// 1. 核心数据：菜品库（需根据你的项目实际菜品补充，务必包含type/category/link/name）
const allDishes = ref([
  // 汤类（type: '汤'）
  { name: '鸡血汤', link: '/炖菜/鸡血汤.md', type: '汤', category: '炖菜' },
  { name: '冬瓜丸子汤', link: '/汤品/冬瓜丸子汤.md', type: '汤', category: '汤品' },
  { name: '番茄蛋花汤', link: '/汤品/番茄蛋花汤.md', type: '汤', category: '汤品' },
  // 菜类（type: '菜'）
  { name: '菠萝咕咾肉', link: '/炒菜/菠萝咕咾肉.md', type: '菜', category: '炒菜' },
  { name: '白菜炖豆腐', link: '/炖菜/白菜炖豆腐.md', type: '菜', category: '炖菜' },
  { name: '菠菜蛋皮丝', link: '/烫菜/菠菜蛋皮丝.md', type: '菜', category: '烫菜' },
  { name: '傲椒风味翅尖', link: '/炸品/傲椒风味翅尖.md', type: '菜', category: '炸品' },
  { name: '蚕豆炒鸡蛋', link: '/炒菜/蚕豆炒鸡蛋.md', type: '菜', category: '炒菜' },
  { name: '葱油拌面', link: '/烫菜/葱油拌面.md', type: '菜', category: '烫菜' },
  // 请根据你的项目补充更多菜品...
]);

// 2. 响应式状态管理
const dishList = ref([]); // 当前选中的菜品列表（四菜一汤初始化）
const selectedCategory = ref(''); // 选中的类别（用于指定类别加菜）
const exportLoading = ref(false); // 导出加载状态
const tipsText = ref(''); // 提示文本（如“不能再减了”）

// 3. 计算属性（简化逻辑）
// 统计当前汤/菜数量
const soupCount = computed(() => dishList.value.filter(d => d.type === '汤').length);
const dishCount = computed(() => dishList.value.filter(d => d.type === '菜').length);
// 边界判断：是否达到最大加菜数（可自定义，如最多8道菜、2道汤）
const isMaxDish = computed(() => dishCount.value >= 8);
const isMaxSoup = computed(() => soupCount.value >= 2);
// 所有不重复的类别（用于下拉框）
const allCategories = computed(() => {
  return [...new Set(allDishes.value.map(d => d.category))];
});
// 判断选中类别是否有可用菜品（排除已在列表中的）
const hasCategoryDish = computed(() => {
  if (!selectedCategory.value) return false;
  const categoryDishes = allDishes.value.filter(d => d.category === selectedCategory.value);
  const usedLinks = dishList.value.map(d => d.link);
  return categoryDishes.some(d => !usedLinks.includes(d.link));
});

// 4. 工具函数（复用逻辑）
/**
 * 从指定条件筛选菜品
 * @param {Object} filter - 筛选条件（如{type: '汤', category: '炖菜'}）
 * @returns {Object|null} 随机筛选出的1道未重复菜品（无则返回null）
 */
const getRandomDish = (filter = {}) => {
  // 筛选符合条件的菜品
  let candidates = allDishes.value.filter(dish => {
    return Object.entries(filter).every(([key, val]) => dish[key] === val);
  });
  // 排除已在当前列表中的菜品
  const usedLinks = dishList.value.map(d => d.link);
  candidates = candidates.filter(d => !usedLinks.includes(d.link));
  // 无符合条件的菜品
  if (candidates.length === 0) return null;
  // 随机返回1道
  return candidates[Math.floor(Math.random() * candidates.length)];
};

// 5. 核心功能实现
/**
 * 初始化：生成四菜一汤（1汤+4菜）
 */
const initDishList = () => {
  const newList = [];
  // 1. 先加1道汤
  const soup = getRandomDish({ type: '汤' });
  if (soup) newList.push(soup);
  // 2. 再加4道菜（确保不重复）
  let dishCount = 0;
  while (dishCount < 4) {
    const dish = getRandomDish({ type: '菜' });
    if (dish && !newList.some(d => d.link === dish.link)) {
      newList.push(dish);
      dishCount++;
    }
  }
  dishList.value = newList;
  showTip('初始化四菜一汤成功！');
};

/**
 * 重新生成全部菜品（重置为四菜一汤）
 */
const regenerateAll = () => {
  initDishList();
};

/**
 * 单菜重新随机（仅替换指定索引的菜品，保持原类型）
 * @param {number} index - 要替换的菜品索引
 */
const regenerateSingle = (index) => {
  const oldDish = dishList.value[index];
  const newDish = getRandomDish({ type: oldDish.type, category: oldDish.category });
  if (newDish) {
    dishList.value.splice(index, 1, newDish);
    showTip(`已重新随机【${oldDish.name}】为【${newDish.name}】`);
  } else {
    showTip(`该类别（${oldDish.category}）已无更多菜品可替换！`);
  }
};

/**
 * 加菜（指定类型：菜/汤）
 * @param {string} type - 要添加的类型（'菜'或'汤'）
 */
const addDish = (type) => {
  const newDish = getRandomDish({ type });
  if (newDish) {
    dishList.value.push(newDish);
    showTip(`已添加${type}：【${newDish.name}】`);
  } else {
    showTip(`已无更多${type}可添加！`);
  }
};

/**
 * 减菜（删除指定索引的菜品）
 * @param {number} index - 要删除的菜品索引
 */
const removeDish = (index) => {
  const removedDish = dishList.value.splice(index, 1)[0];
  showTip(`已删除：【${removedDish.name}】`);
};

/**
 * 指定类别加菜（从选中类别中随机加1道）
 */
const addCategoryDish = () => {
  const newDish = getRandomDish({ category: selectedCategory.value });
  if (newDish) {
    dishList.value.push(newDish);
    showTip(`已添加【${selectedCategory.value}】类别菜品：【${newDish.name}】`);
  } else {
    showTip(`该类别（${selectedCategory.value}）已无更多菜品可添加！`);
  }
};

/**
 * 导出当前菜品列表为README.md
 * 逻辑：1. 读取每个菜品的.md内容 → 2. 拼接成新README → 3. 下载文件
 */
const exportReadme = async () => {
  exportLoading.value = true;
  showTip('正在导出README...');
  try {
    // 1. 收集所有菜品的详情（读取每个菜品的.md文件）
    const readmeParts = [`# 我的菜品清单（共${dishList.value.length}道）\n\n`];
    for (const dish of dishList.value) {
      // 注意：开发环境下，菜品路径为根目录（如/炒菜/菠萝咕咾肉.md）
      const response = await fetch(dish.link);
      if (!response.ok) throw new Error(`读取${dish.name}详情失败`);
      let content = await response.text();

      // 2. 处理菜品内容（去掉frontmatter，保留正文）
      content = content.replace(/^---[\s\S]*?---/, ''); // 移除frontmatter（如---layout: page---）
      readmeParts.push(`## ${dish.name}（${dish.type} · ${dish.category}）\n`);
      readmeParts.push(content + '\n\n');
    }

    // 3. 生成README文件并下载
    const readmeContent = readmeParts.join('');
    const blob = new Blob([readmeContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `我的菜品清单_${new Date().toLocaleDateString()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showTip('README导出成功！');
  } catch (error) {
    showTip(`导出失败：${error.message}`);
    console.error('导出错误：', error);
  } finally {
    exportLoading.value = false;
  }
};

/**
 * 显示提示（3秒后自动消失）
 * @param {string} text - 提示文本
 */
const showTip = (text) => {
  tipsText.value = text;
  setTimeout(() => tipsText.value = '', 3000);
};

// 6. 组件挂载时初始化四菜一汤
onMounted(() => {
  initDishList();
});
</script>

<style scoped>
/* 基础样式：适配VitePress风格 */
.dish-container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1.5rem;
  font-family: var(--vp-font-family-base);
}

/* 标题与操作区 */
.header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}
.header h2 {
  color: var(--vp-c-text-1);
  font-size: 1.5rem;
  font-weight: 600;
}

/* 按钮样式：区分主次 */
.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn.primary {
  background: var(--vp-c-primary);
  color: white;
}
.btn.success {
  background: var(--vp-c-success);
  color: white;
}
.btn.secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
}
.btn.danger {
  background: var(--vp-c-danger-light);
  color: var(--vp-c-danger);
}
.btn.mini {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* 加菜控制区 */
.add-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}
.category-select {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-border);
  background: white;
  font-size: 0.9rem;
  color: var(--vp-c-text-1);
}

/* 菜品列表：卡片式布局 */
.dish-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}
.dish-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  transition: all 0.2s;
}
.dish-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}
.dish-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.dish-tag {
  padding: 0.2rem 0.4rem;
  background: var(--vp-c-primary-light);
  color: var(--vp-c-primary);
  font-size: 0.7rem;
  border-radius: 4px;
}
.dish-category {
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
}
.dish-name {
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  text-decoration: none;
  font-weight: 500;
}
.dish-name:hover {
  color: var(--vp-c-primary);
  text-decoration: underline;
}
.dish-actions {
  display: flex;
  gap: 0.5rem;
}

/* 提示文本 */
.tips {
  padding: 0.8rem;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
}
</style>