# 场景图片与热点交付规范

所有下列图片仍待提供；现有四张图只是明确标记的开发素材。本清单是后续插画制作需求，不是已发布内容或自动生成词汇。

## 统一要求

- 每张正式原图 **1536 × 1024 像素，横向 3:2**，不可裁切或拉伸来凑比例。交付 PNG 原图；网站使用同名 WebP（或经审核的 AVIF）和缩略图。
- 原创 2D 插画，面向成人，干净温暖自然，颜色柔和但不偏黄、不偏冷、不鲜艳。统一透视，物品形状明确，约 10–15 个学习对象，丰富而不杂乱。
- 禁止写实摄影、3D 塑料质感、廉价素材库风格、知名动画或受版权保护角色、任何中英文标注/品牌、水印、重复物品、奇怪或不可辨认的物体。
- 人物少量且次要，动作自然且不重复，不挡住目标；学习物品有合理间距。
- 每行“目标词 / 必须出现的物品”里的全部物品都必须清楚出现；不能靠猜测隐藏物品补足单词。
- 手机端仍显示完整原图。对小物件的构图优先安排在前景，目标在原图最好至少 80 × 80 像素；小于此尺寸时需要检查触控可用性，不能把热点硬放大到相邻物品上。
- 文件路径为 `public/scenes/<文件名>`，缩略图为同名 `-thumb.webp`（宽不超过 640 像素、保持比例）。优化主图不超过 **500,000 字节**，不得牺牲物体可辨认性。
- 每张新图重新审核词汇、英式 IPA、例句及全部热点后才可 `published: true`。未提供的场景维持 `published: false`。
- 未来同主题第二张图须另立构图及词汇清单，文件编号 `-02`，是真正不同图片。当前不建立虚假 Scene 2。

## 逐场景清单

下列每张尺寸均为 **1536 × 1024**；共同禁项适用于每一行。

| 大类目 | 场景 | 图片文件名 | 目标词 / 必须出现的物品 | 构图要求 | 额外禁止内容 |
|---|---|---|---|---|---|
| Everyday Life | Kitchen | `kitchen-01.webp` | refrigerator, oven, hob, kettle, saucepan, frying pan, sink, tap, chopping board, plate | 宽敞厨房全景；灶台与水槽分置两侧，案板与餐具置于无遮挡台面。 | 避免桌椅占据画面中心，不放旅行包。 |
| Everyday Life | Living Room | `living-room-01.webp` | sofa, cushion, armchair, rug, curtain, lamp, bookshelf, television, remote control, coffee table | 沙发、单人椅和茶几形成自然起居区，小物件分散摆放。 | 遥控器不能埋在抱枕下。 |
| Everyday Life | Bedroom | `bedroom-01.webp` | bed, pillow, duvet, wardrobe, bedside table, alarm clock, mirror, hanger, slippers, drawer | 床占中景；衣柜、床头柜和落地镜可辨，拖鞋在前景。 | 避免用同一被子遮住所有床品。 |
| Everyday Life | Bathroom | `bathroom-01.webp` | bath, shower, toilet, washbasin, tap, towel, toothbrush, toothpaste, soap, shampoo | 洗漱台、浴缸与淋浴区域分开；个人用品放在前景台面。 | 禁止人体裸露；包装不出现文字品牌。 |
| Everyday Life | Laundry Room | `laundry-room-01.webp` | washing machine, tumble dryer, laundry basket, detergent, clothes peg, washing line, iron, ironing board, shirt, sock | 洗衣设备靠后，熨衣板与衣篮居中，衣夹与袜子在前景。 | 不要用完全相同外观区分两种洗衣设备。 |
| Food & Shopping | Supermarket | `supermarket-01.webp` | shopping trolley, shopping basket, apple, banana, tomato, bread, milk, egg, shelf, checkout | 果蔬区、冷柜与收银台均可辨；手提篮和购物车独立摆放。 | 不出现价格文字或品牌；小食品不可堆叠到无法辨认。 |
| Food & Shopping | Restaurant | `restaurant-01.webp` | menu, plate, bowl, fork, knife, spoon, glass, napkin, tray, table | 温暖餐厅一桌为主，餐具留出清晰间距，菜单以无字封面表示。 | 不出现可读菜单文字；人物不可挡住桌面。 |
| Food & Shopping | Café | `cafe-01.webp` | cup, saucer, mug, coffee machine, coffee grinder, milk jug, teaspoon, croissant, cake, counter | 以咖啡吧台为中心，机器在后景，杯碟与烘焙食品在前景。 | 不得再次使用厨房家具作为全部目标词；无咖啡连锁品牌。 |
| Food & Shopping | Bakery | `bakery-01.webp` | loaf, baguette, roll, croissant, muffin, doughnut, cake, baking tray, tongs, display cabinet | 烘焙柜分隔摆放不同形状产品，夹子与烤盘靠前。 | 面包形状不能全部雷同；玻璃反光不遮挡食品。 |
| Food & Shopping | Local Market | `local-market-01.webp` | market stall, basket, scales, carrot, potato, onion, cabbage, pepper, pumpkin, coin | 一个开放菜摊全景，蔬菜分类成小组，秤与零钱位于柜面。 | 不用大量路人遮住摊位；硬币不可画得像食品。 |
| Travel & Transport | Airport | `airport-01.webp` | aeroplane, suitcase, backpack, passport, boarding pass, trolley, check-in desk, conveyor belt, seat, gate | 机场出发厅视角；窗外飞机清晰可见，证件在近处置物台上。 | 护照及登机牌不含真实个人信息或可读文字；无航空公司标志。 |
| Travel & Transport | Train Station | `train-station-01.webp` | train, platform, railway track, ticket machine, ticket, suitcase, bench, clock, departure board, escalator | 站台与候车区共存，列车轮廓清楚，售票机靠前。 | 不把人放在铁轨上；时刻表仅用无可读文字图形。 |
| Travel & Transport | Metro Station | `metro-station-01.webp` | train, ticket barrier, ticket machine, travel card, escalator, stairs, platform, handrail, map, bench | 入口闸机与站台有清晰前后层次，交通卡放于前景。 | 线路图无城市名称和文字；不得让闸机与售票机长相相同。 |
| Travel & Transport | Hotel | `hotel-01.webp` | reception desk, key card, suitcase, luggage trolley, lift, bell, sofa, lamp, plant, telephone | 大堂接待区，房卡和服务铃在台面前缘。 | 不出现真实酒店品牌、身份证件或住客信息。 |
| Travel & Transport | City Street | `city-street-01.webp` | pavement, pedestrian crossing, traffic light, bus, taxi, bicycle, postbox, street lamp, bench, bin | 平视街景，人行道在前景，车辆相互分隔。 | 交通关系安全自然，避免重复车辆及车牌文字。 |
| Work & Study | Office | `office-01.webp` | desk, office chair, computer, keyboard, mouse, monitor, printer, telephone, notebook, stapler | 成人办公室单个工作区；显示器、主机及输入设备外形分明。 | 屏幕不显示敏感资料；不能把电脑和显示器画成同一物品作为双热点。 |
| Work & Study | Meeting Room | `meeting-room-01.webp` | conference table, chair, whiteboard, marker, projector, screen, laptop, speaker, water jug, notepad | 会议桌斜向延伸，投影和白板分墙放置，小物在近景。 | 屏幕与白板无文字；人物最多两位且不遮挡目标。 |
| Work & Study | Classroom | `classroom-01.webp` | desk, chair, whiteboard, marker, textbook, ruler, pencil, rubber, schoolbag, clock | 安静教室的近排桌面；文具足够大，背景教室布局合理。 | 不使用儿童卡通角色；黑板不写单词。 |
| Work & Study | Library | `library-01.webp` | bookshelf, book, dictionary, desk, chair, reading lamp, bookmark, computer, magazine, noticeboard | 书架与阅览桌同时可见，字典和杂志以明显装帧区分。 | 无可读书名；不要同一书形代表所有不同词。 |
| Health & Fitness | Gym | `gym-01.webp` | treadmill, exercise bike, dumbbell, weight bench, exercise mat, exercise ball, skipping rope, towel, water bottle, gym bag | 健身器械靠后分开，垫子、哑铃与跳绳放于清楚可见前景。 | 不把哑铃压住整块垫子；不用夸张肌肉人物抢主体。 |
| Health & Fitness | Pharmacy | `pharmacy-01.webp` | counter, shelf, medicine bottle, pill packet, plaster, bandage, thermometer, first-aid kit, weighing scales, hand sanitiser | 药房柜台前景有可辨医疗用品，货架作背景。 | 无药品牌或用药剂量文字；避免同包装重复凑词。 |
| Health & Fitness | Clinic | `clinic-01.webp` | examination couch, chair, stethoscope, thermometer, blood pressure monitor, weighing scales, sink, gloves, mask, curtain | 干净温暖诊室，检查床与仪器相互分隔，小物放于台面。 | 不出现血液、伤口或检查人体的敏感画面。 |
| Health & Fitness | Hospital | `hospital-01.webp` | hospital bed, pillow, bedside cabinet, wheelchair, crutch, drip stand, monitor, call button, curtain, tray | 普通病房无人或一名远景人员，床边设备完整可辨。 | 不出现伤口或急救场面；无病人信息和监护数字。 |
| Nature & Leisure | Park | `park-01.webp` | tree, flower, grass, path, pond, duck, bench, fountain, bicycle, bin | 公园小径延伸至池塘，近处长椅和自行车，鸭子体量可辨。 | 不把草和树背景完全融合；避免重复鸭子群。 |
| Nature & Leisure | Camping | `camping-01.webp` | tent, sleeping bag, rucksack, torch, lantern, camping stove, kettle, camping chair, cool box, compass | 营地帐篷在中景，装备在前景有序摆放，火源安全隔离。 | 不出现森林大火；指南针不可小到看不见。 |
| Nature & Leisure | Beach | `beach-01.webp` | sand, sea, wave, shell, bucket, spade, beach umbrella, deckchair, towel, sunglasses | 海滩前景摆放独立物品，海浪在中后景，伞与椅子保留间距。 | 人物不占主画面；不以文字标注海沙等背景词。 |
| Nature & Leisure | Outdoor Sports | `outdoor-sports-01.webp` | bicycle, helmet, skateboard, roller skates, tennis racket, tennis ball, football, basketball, goal, net | 公园运动场视角，装备按运动合理分区。 | 不把多个球挤在一起；不出现不合理危险动作。 |
| Nature & Leisure | Underwater World | `underwater-01.webp` | whale, shark, fish, turtle, octopus, crab, seahorse, jellyfish, lobster, shrimp | 自然海底横向全景，大小动物分层但都清晰，留出足够空隙供独立热点。 | 不出现海底办公室、穿衣动物或重复拟人动作；章鱼腕足及虾蟹外形需准确。 |

## 现有开发素材与替换策略

| 场景 | 当前开发文件 | 原尺寸 | 主图大小 | 状态 |
|---|---|---|---|---|
| Kitchen | `development/kitchen.webp` | 1586 × 992 | 105,434 B | 内容已逐项核验；非正式比例，仅临时使用 |
| Airport | `development/airport.webp` | 1536 × 1024 | 97,226 B | 内容已逐项核验；画风仍待正式素材替换 |
| Gym | `development/gym.webp` | 1329 × 1183 | 133,662 B | 内容已逐项核验；非正式比例，仅临时使用 |
| Supermarket | `development/supermarket.webp` | 1536 × 1024 | 158,580 B | 内容已逐项核验；水果较小，有键盘和文字访问入口 |

这些开发图片保持原尺寸比例，不裁掉内容或拉伸到 3:2。其原 PNG 留在 `src/assets/scenes` 作为来源记录，不会打包加载到生产页面。Café 图没有清晰咖啡器具，海底图偏离自然海底主题及正式构图要求，均不发布。

正式插画到位后，按上表正式目标词重新编写独立内容，不直接沿用旧图热点或从文件名自动切图。共同词尽量沿用已有 vocabularyId；新增物体用新 ID。移除的旧词不会伪装为新词的已学进度。

## 加图、校准与发布流程

1. 安装可选图片工具：`python -m pip install -r requirements-assets.txt`。
2. 执行 `python scripts/prepare-scene.py supplied.png public/scenes/kitchen-01.webp`。正式模式强制尺寸且生成 WebP 与缩略图；不裁切、不拉伸。仅旧开发素材使用 `--development`。
3. 在 `src/content.ts` 新增完整 `VocabularyItem` 与 `Scene`。图片是可替换的相对路径，加载统一经 `assetUrl` 处理 GitHub Pages 前缀。
4. 开发模式运行 `npm run dev`，进入场景，打开 **Hotspot calibration (development only)**。开发预览新场景期间可临时设 published；提交前必须先完成下列校验。
5. 以原图左上角为原点，矩形的 x/y/width/height 都归一化到 0–1；支持矩形和椭圆。点击图像读取坐标；选择对象调整边界；查看草稿叠层；复制 JSON 回写数据。
6. 显示名称、边界和中心点；逐个点击、聚焦，检查相邻小物没有被大热点覆盖。大范围热点先绘制，小热点后绘制，交互状态不得改变按钮层级。
7. 桌面、平板、手机检查整图和热点共用同一个原始宽高比容器。校准后设 `assetStatus: 'final'`、`published: true`。
8. 同主题真实下一张图通过 `nextSceneId` 连接；无下一图为 null。测试会拒绝当前图、重复图片和未发布图片。
9. 运行 README 的完整检查链，提交并由现有 GitHub Actions 部署。

开发校准 UI 被 `import.meta.env.DEV` 限制，生产构建不会出现。校准 JSON 只是草稿输出；不会在生产界面保存未经审查的新内容。
