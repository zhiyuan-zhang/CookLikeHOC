---
layout: page
title: 随机推荐菜品
---


<!-- 关键：用 <ClientOnly> 包裹 Vue 模板，强制客户端渲染 -->
<ClientOnly>
  <template #default>
    <div class="random-container">
      <div class="loading" v-if="!isLoaded">
        正在加载菜品数据...
      </div>
      <div v-else>
        <div class="controls">
          <button 
            @click="regenerateAll" 
            class="btn primary"
            :disabled="!canGenerate"
          >
            重新生成全部
          </button>
          <div class="category-selector">
            <select v-model="selectedCategory">
              <option value="">选择菜品类别</option>
              <option v-for="category in uniqueCategories" :value="category" :key="category">
                {{ category }}
              </option>
            </select>
            <button 
              @click="addSpecificCategoryDish" 
              class="btn secondary"
              :disabled="!selectedCategory"
            >
              添加此类菜品
            </button>
          </div>
          <button 
            @click="addDish" 
            class="btn secondary"
            :disabled="allDishes.length <= currentDishes.length"
          >
            加菜
          </button>
        </div>
        <!-- 菜品不足提示 -->
        <div class="empty-tip" v-if="!canGenerate">
          菜品数量不足，无法生成推荐
        </div>
        <!-- 菜品列表 -->
        <div class="dish-grid" v-else>
          <div v-for="(dish, index) in currentDishes" :key="index" class="dish-card">
            <div class="dish-info">
              <a :href="dish.link" target="_blank" class="dish-name">
                {{ dish.name }}
              </a>
              <span class="dish-category">[{{ dish.category }}]</span>
              <span class="dish-type" v-if="dish.category === '汤类'">汤</span>
            </div>
            <div class="dish-actions">
              <button 
                @click="regenerateSingle(index)" 
                class="btn tiny"
              >
                重新随机
              </button>
              <button 
                @click="removeDish(index)" 
                class="btn tiny danger"
                :disabled="currentDishes.length <= 1"
              >
                移除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</ClientOnly>

<script setup>
import { ref, onMounted, computed } from 'vue';

// 响应式变量
const allDishes = ref([]); // 所有菜品
const isLoaded = ref(false); // 加载状态
const currentDishes = ref([]); // 当前显示的菜品
const selectedCategory = ref(''); // 选中的菜品类别

// 计算属性
const canGenerate = computed(() => {
  // 至少需要5道菜，且至少有1道汤
  return allDishes.value.length >= 5 && 
         allDishes.value.some(dish => dish.type === '汤类');
});

const uniqueCategories = computed(() => {
  // 获取所有不重复的菜品类别
  const categories = new Set();
  allDishes.value.forEach(dish => categories.add(dish.category));
  return Array.from(categories);
});

// 加载菜品数据
onMounted(async () => {
  try {
    const response = await fetch('.vitepress/public/dishes.json');
    if (!response.ok) throw new Error('菜品数据加载失败');
    allDishes.value = await response.json();
    // 初始化生成四菜一汤
    generateFourDishesAndSoup();
  } catch (error) {
    console.error('加载菜品数据错误：', error);
    alert(`菜品数据加载失败：${error.message}`);
  } finally {
    isLoaded.value = true;
  }
});

// 生成四菜一汤
const generateFourDishesAndSoup = () => {
  if (!canGenerate.value) return;
  
  // 分离出汤类和非汤类菜品
  const soups = allDishes.value.filter(dish => dish.type === '汤类');
  const nonSoups = allDishes.value.filter(dish => dish.type !== '汤类');
  
  // 随机选择1道汤
  const randomSoup = soups[Math.floor(Math.random() * soups.length)];
  
  // 随机选择4道非汤类菜品
  const shuffledNonSoups = [...nonSoups].sort(() => Math.random() - 0.5);
  const selectedDishes = shuffledNonSoups.slice(0, 4);
  
  // 合并并打乱顺序（但保留四菜一汤的数量）
  currentDishes.value = [...selectedDishes, randomSoup].sort(() => Math.random() - 0.5);
};

// 重新生成全部菜品
const regenerateAll = () => {
  generateFourDishesAndSoup();
};

// 重新随机单个菜品
const regenerateSingle = (index) => {
  const currentDish = currentDishes.value[index];
  let candidates;
  
  // 如果是汤，只从汤类中随机替换
  if (currentDish.type === '汤类') {
    candidates = allDishes.value.filter(dish => dish.type === '汤类');
  } else {
    // 非汤类菜品，从非汤类中随机替换
    candidates = allDishes.value.filter(dish => dish.type !== '汤类');
  }
  
  // 确保不重复选择当前菜品
  const filteredCandidates = candidates.filter(dish => dish.link !== currentDish.link);
  
  if (filteredCandidates.length > 0) {
    const randomIndex = Math.floor(Math.random() * filteredCandidates.length);
    currentDishes.value.splice(index, 1, filteredCandidates[randomIndex]);
  }
};

// 移除菜品
const removeDish = (index) => {
  if (currentDishes.value.length > 1) {
    currentDishes.value.splice(index, 1);
  }
};

// 添加菜品
const addDish = () => {
  // 找出不在当前列表中的菜品
  const availableDishes = allDishes.value.filter(dish => 
    !currentDishes.value.some(d => d.link === dish.link)
  );
  
  if (availableDishes.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableDishes.length);
    currentDishes.value.push(availableDishes[randomIndex]);
  }
};

// 添加指定类别的菜品
const addSpecificCategoryDish = () => {
  if (!selectedCategory.value) return;
  
  // 找出指定类别且不在当前列表中的菜品
  const availableDishes = allDishes.value.filter(dish => 
    dish.category === selectedCategory.value &&
    !currentDishes.value.some(d => d.link === dish.link)
  );
  
  if (availableDishes.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableDishes.length);
    currentDishes.value.push(availableDishes[randomIndex]);
  } else {
    alert(`没有更多${selectedCategory.value}可以添加了`);
  }
};
</script>

<style scoped>
.random-container {
  max-width: 1000px;
  margin: 2rem auto;
  padding: 0 1rem;
}

/* 加载状态样式 */
.loading {
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
  background: #f8f8f8;
  border-radius: 8px;
  text-align: center;
}

/* 控制按钮区域 */
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
}

.category-selector {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

/* 按钮样式 */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn.primary {
  background: #3eaf7c;
  color: white;
}

.btn.secondary {
  background: #42b983;
  color: white;
}

.btn.danger {
  background: #ff4444;
  color: white;
}

.btn.tiny {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
}

/* 菜品不足提示 */
.empty-tip {
  padding: 2rem;
  color: #ff4444;
  background: #fff8f8;
  border: 1px solid #ffdddd;
  border-radius: 8px;
  text-align: center;
}

/* 菜品网格布局 */
.dish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* 菜品卡片 */
.dish-card {
  background: #070707;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}

.dish-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.dish-info {
  margin-bottom: 1rem;
}

.dish-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  text-decoration: none;
  margin-right: 0.5rem;
}

.dish-name:hover {
  color: #3eaf7c;
  text-decoration: underline;
}

.dish-category {
  color: #666;
  font-size: 0.9rem;
}

.dish-type {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.1rem 0.5rem;
  background: #e3f2fd;
  color: #0d47a1;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.dish-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .category-selector {
    flex-direction: column;
    align-items: stretch;
  }
  
  .dish-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .dish-grid {
    grid-template-columns: 1fr;
  }
}
</style>
