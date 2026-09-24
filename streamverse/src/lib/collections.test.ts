import { describe, expect, it } from "vitest";

import { mapCollectionRow, mapCollectionItemRow, buildCollectionItemKey } from "@/lib/collections";

describe("collections helpers", () => {
  it("maps a collection row with item count", () => {
    const row = {
      id: "1",
      user_id: "user-1",
      name: "Favorites",
      description: "Top picks",
      cover_image_url: null,
      is_public: true,
      created_at: "2024-01-01T00:00:00Z",
    };

    const collection = mapCollectionRow(row, 3);
    expect(collection.id).toBe("1");
    expect(collection.userId).toBe("user-1");
    expect(collection.name).toBe("Favorites");
    expect(collection.description).toBe("Top picks");
    expect(collection.coverImageUrl).toBeNull();
    expect(collection.isPublic).toBe(true);
    expect(collection.createdAt).toBe("2024-01-01T00:00:00Z");
    expect(collection.itemCount).toBe(3);
  });

  it("maps a collection item row", () => {
    const row = {
      id: "item-1",
      collection_id: "col-1",
      media_type: "movie",
      media_id: "123",
      added_at: "2024-01-02T00:00:00Z",
      sort_order: 0,
    };

    const item = mapCollectionItemRow(row);
    expect(item.id).toBe("item-1");
    expect(item.collectionId).toBe("col-1");
    expect(item.mediaType).toBe("movie");
    expect(item.mediaId).toBe("123");
    expect(item.addedAt).toBe("2024-01-02T00:00:00Z");
  });

  it("builds a stable collection item key", () => {
    expect(buildCollectionItemKey("movie", "123")).toBe("movie:123");
    expect(buildCollectionItemKey("tv", "456")).toBe("tv:456");
  });
});