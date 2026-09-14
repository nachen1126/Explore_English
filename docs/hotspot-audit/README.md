# Published scene hotspot audit

The shared image/overlay geometry was already sound. The inaccurate expansion scenes used coarse, mostly rectangular 1000-grid estimates as final coordinates; some boxes included adjacent objects or were shifted from the actual object. None of the expansion scenes reused another scene's coordinate array or generated positions from vocabulary order.

Kitchen and Airport remain the untouched reference coordinate sets. Every other scene was measured independently against its own 1536×1024 source artwork using tight polygons, ellipses, or rectangles. These review images are generated from the same normalized hotspot records used by Explore and Find It. Red outlines are the visual/click regions; the dot is each region's centre.

Automated normalized-geometry tests cover all 13 published scenes at seven responsive widths (320, 390, 768, 1093, 1152, 1280, and 1536 px): 91 scene/viewport checks confirm that every region stays inside the image and scales from the same coordinate system. Classroom and Train Station were additionally clicked object-by-object in the browser at 1280×720 and 390×844; their image, hotspot layer, and intrinsic-ratio frame had identical rendered bounds, with no marker outside the image.

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
| Classroom | 1536×1024 | 10 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](classroom-1.jpg) |
| Train Station | 1536×1024 | 10 | 已逐物品重新校准 | 已验证 | 已验证 | [截图](train-station-1.jpg) |
