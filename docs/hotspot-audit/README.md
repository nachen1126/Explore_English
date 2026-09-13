# Published scene hotspot audit

The shared image/overlay geometry was already sound. The inaccurate expansion scenes used coarse, mostly rectangular 1000-grid estimates as final coordinates; some boxes included adjacent objects or were shifted from the actual object. None of the expansion scenes reused another scene's coordinate array or generated positions from vocabulary order.

Kitchen and Airport remain the untouched reference coordinate sets. The other nine published scenes were measured independently against their 1536×1024 source artwork and changed to tight polygons, ellipses, or rectangles. These review images are generated from the same normalized hotspot records used by Explore and Find It. Red outlines are the visual/click regions; the dot is each region's centre.

Responsive geometry was checked at 1366×768, 1440×900, 1920×1080, 320×700, 375×812, 390×844, 430×932, and 844×390. All 88 scene/viewport checks confirmed that the image, hotspot layer, and intrinsic-ratio frame have matching bounds and every region stays inside the image. A 125% effective CSS viewport was also covered by the percentage-coordinate tests.

The deployed calibration mode is opt-in only: `?hotspotDebug=1#/scene/<scene-id>`. It displays boundaries, labels, centres, coordinates, intrinsic/rendered image sizes, container offset, viewport width, version match, overlaps, and out-of-bounds status.

| Scene | Image | Regions | Calibration | Desktop | Mobile | Debug screenshot |
| --- | --- | ---: | --- | --- | --- | --- |
| Kitchen · Cooking | 1536×1024 | 15 | 参考坐标保留 | 已验证 | 已验证 | [截图](kitchen-2.jpg) |
| Airport · Departures | 1536×1024 | 15 | 参考坐标保留 | 已验证 | 已验证 | [截图](airport-2.jpg) |
| Living Room | 1536×1024 | 12 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](living-room-1.jpg) |
| Bathroom | 1536×1024 | 12 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](bathroom-1.jpg) |
| Laundry Room | 1536×1024 | 12 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](laundry-room-1.jpg) |
| Supermarket | 1536×1024 | 10 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](supermarket-2.jpg) |
| Café | 1536×1024 | 10 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](cafe-1.jpg) |
| Swimming Pool | 1536×1024 | 11 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](swimming-pool-1.jpg) |
| Skincare | 1536×1024 | 10 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](skin-care-1.jpg) |
| Hotel Room | 1536×1024 | 14 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](hotel-room-1.jpg) |
| Underwater World | 1536×1024 | 11 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](underwater-1.jpg) |
