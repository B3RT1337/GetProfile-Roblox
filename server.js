// GetInfo-Roblox Made by B3RT1337 - 7/19/2025
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/info/:username", async (req, res) => {
  const username = req.params.username;

  try {
    // Step 1: Get User ID from Username
    const userRes = await axios.post(
      "https://users.roblox.com/v1/usernames/users",
      {
        usernames: [username],
        excludeBannedUsers: false,
      }
    );

    const user = userRes.data.data[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const userId = user.id;

    // Step 2: Run all requests in parallel
    const [
      descriptionRes,
      presenceRes,
      avatarRes,
      friendsRes,
      followersRes,
      followingsRes,
      groupsRes,
      usernameHistoryRes,
      badgesRes,
      inventoryRes,
      premiumRes,
      socialLinksRes
    ] = await Promise.allSettled([
      axios.get(`https://users.roblox.com/v1/users/${userId}`),
      axios.post("https://presence.roblox.com/v1/presence/users", {
        userIds: [userId],
      }),
      axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/followings/count`),
      axios.get(`https://groups.roblox.com/v2/users/${userId}/groups/roles`),
      axios.get(`https://users.roblox.com/v1/users/${userId}/username-history?limit=50&sortOrder=Desc`),
      axios.get(`https://accountinformation.roblox.com/v1/users/${userId}/roblox-badges`),
      axios.get(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=10&sortOrder=Asc`),
      axios.get(`https://premiumfeatures.roblox.com/v1/users/${userId}/isPremium`),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/social-links`)
    ]);

    // Helper to extract data or fallback
    const getData = (res) => (res.status === "fulfilled" ? res.value.data : null);

    const description = getData(descriptionRes);
    const presence = getData(presenceRes)?.userPresences?.[0];
    const avatarUrl = getData(avatarRes)?.data?.[0]?.imageUrl || null;
    const friendCount = getData(friendsRes)?.count || 0;
    const followerCount = getData(followersRes)?.count || 0;
    const followingCount = getData(followingsRes)?.count || 0;
    const groupsData = getData(groupsRes)?.data || [];
    const previousNames = getData(usernameHistoryRes)?.data?.map(p => p.name) || [];
    const badges = getData(badgesRes)?.map(b => b.name) || [];
    const inventoryData = getData(inventoryRes)?.data || [];
    const isPremium = getData(premiumRes) || false;
    const socialLinks = getData(socialLinksRes)?.socialLinks || [];

    // Format account age
    const createdDate = new Date(description?.created);
    const now = new Date();
    const ageDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
    const ageYears = Math.floor(ageDays / 365);
    const ageMonths = Math.floor((ageDays % 365) / 30);
    const ageFormatted = `${ageYears} year(s), ${ageMonths} month(s)`;

    const groups = groupsData.map(group => ({
      name: group.group.name,
      role: group.role.name,
      id: group.group.id,
    }));

    const inventory = inventoryData.map(item => ({
      name: item.name,
      assetId: item.assetId,
      assetType: item.assetType,
      recentAveragePrice: item.recentAveragePrice,
      serialNumber: item.serialNumber,
    }));

    const social = socialLinks.map(link => ({
      type: link.type,
      url: link.url,
    }));

    res.json({
      Username: user.name,
      DisplayName: user.displayName,
      Id: userId,
      Description: description?.description || "",
      LastOnline: presence?.lastOnline || "Unknown",
      Verified: description?.hasVerifiedBadge || false,
      AvatarUrl: avatarUrl,
      FriendCount: friendCount,
      FollowerCount: followerCount,
      FollowingCount: followingCount,
      CreatedAt: description?.created || "Unknown",
      AccountAge: ageFormatted,
      PreviousUsernames: previousNames,
      Groups: groups,
      Badges: badges,
      Inventory: inventory,
      IsPremium: isPremium,
      SocialLinks: social
    });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      error: "API failed",
      details: err.response?.data || err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
