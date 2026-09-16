# 微信小程序正式场景迁移清单

数据来源：网页版 `src/data.ts` 汇总后的正式发布目录。同步脚本只提取 `published: true` 且带有正式图片、词汇与热点的数据；`Coming soon` 场景不会进入小程序目录。

状态说明：

- “已迁移”表示分类入口、图片、10 个词、热点、探索、挑战、进度及发音数据已接入统一小程序流程。
- “自动校验通过”表示稳定 ID、图片边界、归一化坐标、缩放和对号框内定位测试通过；13 张网页版校准覆盖图也已逐张人工复核。
- 微信开发者工具逐点点击及真机触摸仍须在实际设备上完成，不能用自动测试冒充人工验收。

| 分类 ID | 分类名称 | 场景 ID | 场景名称 | 场景图片 | 单词数 | 热点区域数 | 迁移状态 | 全热点测试 |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| `sports-fitness` | 运动篇 / Sports & Fitness | `swimming-pool-1` | 游泳池 / Swimming Pool | `scenes/sports-fitness/swimming-pool-1.webp` | 10 | 11 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `beauty-personal-care` | 美妆篇 / Beauty & Personal Care | `skin-care-1` | 护肤 / Skincare | `scenes/beauty-personal-care/skincare-1.webp` | 10 | 10 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `food-dining` | 饮食篇 / Food & Dining | `kitchen-2` | 厨房 / Kitchen · Cooking | `scenes/kitchen-cooking.webp` | 10 | 15 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `food-dining` | 饮食篇 / Food & Dining | `supermarket-2` | 超市 / Supermarket | `scenes/food-dining/supermarket-1.webp` | 10 | 10 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `food-dining` | 饮食篇 / Food & Dining | `cafe-1` | 咖啡馆 / Café | `scenes/food-dining/cafe-1.webp` | 10 | 10 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `animals` | 动物篇 / Animals | `underwater-1` | 海底世界 / Underwater World | `scenes/animals/underwater-world-1.webp` | 10 | 11 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `home-living` | 居家篇 / Home & Living | `living-room-1` | 客厅 / Living Room | `scenes/home-living/living-room-1.webp` | 10 | 12 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `home-living` | 居家篇 / Home & Living | `bathroom-1` | 浴室 / Bathroom | `scenes/home-living/bathroom-1.webp` | 10 | 12 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `home-living` | 居家篇 / Home & Living | `laundry-room-1` | 洗衣房 / Laundry Room | `scenes/home-living/laundry-room-1.webp` | 10 | 12 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `travel-transport` | 旅行篇 / Travel & Transport | `airport-2` | 机场 / Airport · Departures | `scenes/airport-departures.webp` | 10 | 15 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `travel-transport` | 旅行篇 / Travel & Transport | `hotel-room-1` | 酒店房间 / Hotel Room | `scenes/travel-transport/hotel-room-1.webp` | 10 | 14 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `travel-transport` | 旅行篇 / Travel & Transport | `train-station-1` | 火车站 / Train Station | `scenes/travel-transport/train-station-1.webp` | 10 | 10 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |
| `study-work` | 学习与工作篇 / Study & Work | `classroom-1` | 教室 / Classroom | `scenes/study-work/classroom-1.webp` | 10 | 10 | 已迁移 | 覆盖图复核与自动校验通过；小程序逐点待真机 |

## 汇总

- 正式分类：7 个
- 正式场景：13 个
- 词汇：130 个
- 热点区域：152 个（部分物品在图片中由多个不连续区域组成，区域通过同一个稳定 `vocabularyId` 归属同一词）
- 小程序专用图片：13 张 960×640 场景图与 13 张 480×320 缩略图，均由网页版 WebP 原图生成，未覆盖网页版资源
- 数据同步命令：在 `miniapp` 目录运行 `node scripts/sync-web-scenes.mjs`
- 图片准备命令：在 `miniapp` 目录运行 `powershell -ExecutionPolicy Bypass -File scripts/prepare-scene-assets.ps1`
- 发音准备命令：在 `miniapp` 目录运行 `powershell -ExecutionPolicy Bypass -File scripts/generate-pronunciation-assets.ps1`
