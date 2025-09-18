// generate-dish-json.js（ES 模块版，适配 "type": "module"）
import fs from 'fs/promises'; // ES 模块引入 fs（用 promises 版，支持异步）
import path from 'path';
import { fileURLToPath } from 'url'; // ES 模块中获取当前文件路径的工具

// ###########################################################################
// 配置项：根据你的项目结构修改！！！
// ###########################################################################
const config = {
    // 1. 菜品分类文件夹列表（填你项目中实际的菜品分类文件夹名）
    dishFolders: ['主食',
        '凉拌',
        '卤菜',
        '早餐',
        '汤',
        '炒菜',
        '炖菜',
        '炸品',
        '烤类',
        '烫菜',
        '煮锅',
        '砂锅菜',
        '蒸菜',
        '配料',
        '饮品'],

    // 2. 排除的文件（非菜品文件，如每个分类下的 README.md）
    excludeFiles: ['README.md', 'index.md'],
    // 3. JSON 生成路径（.vitepress/public 下，前端可直接访问）
    outputDir: 'public', // 相对于 .vitepress 的子目录
    outputFileName: 'dishes.json',
    // 4. 自动识别「汤品」类别（用于标记 type: '汤'）
    soupFolders: ['汤']
};

// ###########################################################################
// ES 模块中获取 __dirname（替代 CommonJS 的 __dirname）
// ###########################################################################
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ###########################################################################
// 核心逻辑：扫描文件夹生成菜品数据（异步版，适配 ES 模块）
// ###########################################################################
async function generateDishJson() {
    try {
        const allDishes = [];

        // 1. 遍历每个菜品分类文件夹
        for (const folderName of config.dishFolders) {
            // 分类文件夹的完整路径（项目根目录/分类名）
            const folderPath = path.resolve(__dirname, folderName);

            // 跳过不存在的文件夹
            try {
                await fs.access(folderPath); // 检查文件夹是否存在（异步）
            } catch {
                console.warn(`⚠️  分类文件夹不存在，已跳过：${folderName}`);
                continue;
            }

            // 2. 读取分类文件夹下的所有文件（异步）
            const files = await fs.readdir(folderPath);

            // 3. 遍历每个文件，提取菜品信息
            for (const fileName of files) {
                // 排除非菜品文件和非 .md 文件
                if (config.excludeFiles.includes(fileName) || path.extname(fileName) !== '.md') {
                    continue;
                }

                // 提取菜品信息
                const dish = {
                    category: folderName, // 类别（如 炒菜）
                    name: path.basename(fileName, '.md'), // 菜名（去掉 .md 后缀）
                    link: `/${folderName}/${path.basename(fileName, '.md')}`, // 详情 URL（如 /炒菜/菠萝咕咾肉.md）
                    type: config.soupFolders.includes(folderName) ? '汤类' : '菜类' // 类型
                };

                allDishes.push(dish);
            }
        }

        // 4. 生成 JSON 输出路径（.vitepress/public/dishes.json）
        const vitepressPublicDir = path.resolve(__dirname, '.vitepress', config.outputDir);
        const outputPath = path.resolve(vitepressPublicDir, config.outputFileName);

        // 5. 确保 .vitepress/public 目录存在（异步创建）
        await fs.mkdir(vitepressPublicDir, { recursive: true });

        // 6. 写入 JSON 文件（异步，格式化输出）
        await fs.writeFile(
            outputPath,
            JSON.stringify(allDishes, null, 2),
            'utf8'
        );

        console.log(`✅ 菜品 JSON 生成成功！共 ${allDishes.length} 道菜品`);
        console.log(`📁 生成路径：${outputPath}`);
    } catch (error) {
        console.error('❌ 菜品 JSON 生成失败：', error.message);
        process.exit(1); // 生成失败时终止启动流程
    }
}

// 执行脚本（异步调用）
generateDishJson();