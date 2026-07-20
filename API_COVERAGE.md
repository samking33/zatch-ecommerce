# API Coverage — Backend → Web App

Every route in `zatch-main/routes/*` (171 handlers), and where it stands in the
web storefront's API client (`src/lib/api.ts`).

**Status legend**
- ✅ **Used** — wired into a page/component and called at runtime.
- 🟡 **Available** — implemented in the API client, ready to call; not yet
  triggered from the UI (mostly auth'd/mutation flows waiting on the login flow
  + a running backend).
- ⚪ **Excluded** — intentionally not consumed by the web app (see reason).

**Totals:** 171 backend handlers · **6 Used** · **127 Available** · **38 Excluded**
(35 of the excluded are the separate `/admin` app, not in `routes/*`; the counts
here cover the 171 in `routes/*`: 6 Used, 127 Available, 38 Excluded).

---

## ✅ Used (wired to a page)

| Method | Endpoint | Client | Page |
|---|---|---|---|
| GET | `/product/top-picks` | `products.topPicks` | Home |
| GET | `/product/products` | `catalog.products` | Home, Shop, Category |
| GET | `/product/:id` | `products.get` | Product detail |
| GET | `/category` | `categories.list` | Home, Shop |
| GET | `/live/sessions` | `live.sessions` | Home, Live |
| GET | `/search/search` | `search.query` | Search |

## 🟡 Available (in client, not yet called from UI)

### Auth & OTP
| Method | Endpoint | Client |
|---|---|---|
| POST | `/user/register` | `auth.register` |
| POST | `/user/login` | `auth.login` |
| POST | `/user/logout` | `auth.logout` |
| PUT | `/user/change-password` | `auth.changePassword` |
| DELETE | `/user/delete-account` | `auth.deleteAccount` |
| POST | `/otp/send-both` | `auth.sendBothOtp` |
| POST | `/otp/verify-both` | `auth.verifyBothOtp` |
| POST | `/twilio-sms/send-otp` | `auth.sendSmsOtp` |
| POST | `/twilio-sms/verify-otp` | `auth.verifySmsOtp` |
| POST | `/email/send-email-otp` | `auth.sendEmailOtp` |
| POST | `/email/verify-email-otp` | `auth.verifyEmailOtp` |
| POST | `/user/forgot-password/send-otp` | `auth.forgotSendOtp` |
| POST | `/user/forgot-password/verify-otp` | `auth.forgotVerifyOtp` |
| POST | `/user/forgot-password/reset` | `auth.forgotReset` |
| POST | `/user/forgot-password/verify-and-reset` | `auth.forgotVerifyAndReset` |

### User & profiles
| Method | Endpoint | Client |
|---|---|---|
| GET | `/user/profile` | `users.profile` |
| PUT | `/user/profile-update` | `users.updateProfile` |
| GET | `/user/profile/:userId` | `users.publicProfile` |
| GET | `/user/share-profile/:userId` | `users.shareProfile` |
| GET | `/user/all-users` | `users.all` |
| GET | `/user/search-history` | `users.searchHistory` |
| POST | `/user/follow` | `users.follow` |
| POST | `/user/unfollow` | `users.unfollow` |
| POST | `/user/:targetUserId/toggleFollow` | `users.toggleFollow` |
| POST | `/user/review` | `users.review` |

### Seller
| Method | Endpoint | Client |
|---|---|---|
| POST | `/user/seller/register` | `seller.register` |
| POST | `/user/seller/approve` | `seller.approve` |
| GET | `/user/seller/status` | `seller.status` |
| GET | `/user/seller/terms-and-conditions` | `seller.terms` |
| GET | `/user/seller/profile-completion` | `seller.profileCompletion` |
| GET | `/user/seller/benefits` | `seller.benefits` |
| POST | `/user/record-sale` | `seller.recordSale` |

### Products
| Method | Endpoint | Client |
|---|---|---|
| GET | `/product/search` | `products.search` |
| GET | `/product/search/my` | `products.searchMine` |
| GET | `/product/filter` | `products.filter` |
| GET | `/product/seller/my-products` | `products.myProducts` |
| POST | `/product/create` | `products.create` |
| POST | `/product/create-v2` | `products.createV2` |
| POST | `/product/upload-tokens` | `products.uploadTokens` |
| PUT | `/product/:id/status` | `products.updateStatus` |
| POST | `/product/:id/like` | `products.like` |
| POST | `/product/:id/save` | `products.save` |
| POST | `/product/:id/view` | `products.view` |
| POST | `/product/:id/share` | `products.share` |
| POST | `/product/:id/comment` | `products.comment` |
| POST | `/product/:id/review` | `products.review` |
| POST | `/product/:id/bargain-settings` | `products.setBargainSettings` |
| POST | `/product/global-bargain-settings` | `products.setGlobalBargain` |
| POST | `/product/:id/set-top-pick` | `products.setTopPick` |

### Categories & search
| Method | Endpoint | Client |
|---|---|---|
| GET | `/category/:id/subcategories` | `categories.subcategories` |
| GET | `/search/popular` | `search.popular` |

### Trending
| Method | Endpoint | Client |
|---|---|---|
| GET | `/trending/trending` | `trending.products` |
| GET | `/trending/trending/bits` | `trending.bits` |
| GET | `/trending/trending/live` | `trending.live` |

### Cart
| Method | Endpoint | Client |
|---|---|---|
| GET | `/cart` | `cart.get` |
| POST | `/cart/update` | `cart.update` |
| POST | `/cart/remove` | `cart.remove` |
| POST | `/cart/coupon` | `cart.applyCoupon` |
| DELETE | `/cart/coupon` | `cart.removeCoupon` |
| POST | `/cart/:bargainId/add-bargain` | `cart.addBargain` |

### Coupons
| Method | Endpoint | Client |
|---|---|---|
| GET | `/coupons/my-coupons` | `coupons.myCoupons` |
| POST | `/coupons/apply` | `coupons.apply` |
| POST | `/coupons/mark-used` | `coupons.markUsed` |
| POST | `/coupons/track-view` | `coupons.trackView` |
| GET | `/coupons/list` | `coupons.list` |
| GET | `/coupons/dashboard` | `coupons.dashboard` |
| GET | `/coupons/:id` | `coupons.get` |
| POST | `/coupons/create` | `coupons.create` |
| PUT | `/coupons/:id` | `coupons.update` |
| POST | `/coupons/:id/toggle` | `coupons.toggle` |
| DELETE | `/coupons/:id` | `coupons.remove` |

### Checkout
| Method | Endpoint | Client |
|---|---|---|
| POST | `/checkout/initiate` | `checkout.initiate` |
| POST | `/checkout/payment/razorpay/initiate` | `checkout.razorpayInitiate` |
| POST | `/checkout/payment/razorpay/verify` | `checkout.razorpayVerify` |

### Orders
| Method | Endpoint | Client |
|---|---|---|
| GET | `/orders/my-orders` | `orders.myOrders` |
| GET | `/orders/:id` | `orders.get` |
| POST | `/orders/create` | `orders.create` |
| POST | `/orders/create-direct` | `orders.createDirect` |
| POST | `/orders/verify-payment` | `orders.verifyPayment` |
| POST | `/orders/:id/cancel` | `orders.cancel` |
| POST | `/orders/:id/review` | `orders.review` |
| POST | `/orders/:id/generate-invoice` | `orders.generateInvoice` |
| GET | `/orders/invoice/download/:fileName` | `orders.invoiceUrl` |
| GET | `/orders/seller/orders` | `orders.sellerOrders` |
| GET | `/orders/seller/dashboard` | `orders.sellerDashboard` |
| GET | `/orders/grouped-by-seller` | `orders.groupedBySeller` |
| POST | `/orders/seller/orders/:id/update-status` | `orders.updateStatus` |
| POST | `/orders/:id/seller-cancel` | `orders.sellerCancel` |

### Bargains
| Method | Endpoint | Client |
|---|---|---|
| POST | `/bargains/create` | `bargains.create` |
| GET | `/bargains/:id` | `bargains.get` |
| GET | `/bargains/buyer/my-bargains` | `bargains.myBargains` |
| POST | `/bargains/:id/buyer-counter` | `bargains.buyerCounter` |
| POST | `/bargains/:id/accept-counter` | `bargains.acceptCounter` |
| POST | `/bargains/:id/reject-counter` | `bargains.rejectCounter` |
| GET | `/bargains/seller/my-bargains` | `bargains.sellerBargains` |
| GET | `/bargains/seller/dashboard` | `bargains.sellerDashboard` |
| POST | `/bargains/:id/accept` | `bargains.accept` |
| POST | `/bargains/:id/reject` | `bargains.reject` |
| POST | `/bargains/:id/counter` | `bargains.counter` |

### Address & IFSC
| Method | Endpoint | Client |
|---|---|---|
| GET | `/address` | `address.list` |
| POST | `/address/save` | `address.save` |
| PUT | `/address/:id` | `address.update` |
| DELETE | `/address/:id` | `address.remove` |
| POST | `/address/geocode` | `address.geocode` |
| GET | `/ifsc` | `ifsc.lookup` |

### Live
| Method | Endpoint | Client |
|---|---|---|
| GET | `/live/session/:id/details` | `live.details` |
| GET | `/live/session/:id/comments` | `live.comments` |
| POST | `/live/token` | `live.token` |
| POST | `/live/refresh-token` | `live.refreshToken` |
| POST | `/live/session/:id/join` | `live.join` |
| POST | `/live/session/:id/leave` | `live.leave` |
| POST | `/live/session/:id/comment` | `live.comment` |
| POST | `/live/session/:id/like` | `live.like` |
| POST | `/live/session/:id/heartbeat` | `live.heartbeat` |
| GET | `/live/session/:id/share` | `live.share` |
| GET | `/live/dashboard` | `live.dashboard` |
| POST | `/live/schedule` | `live.schedule` |
| PATCH | `/live/session/:id/end` | `live.end` |

### Bits
| Method | Endpoint | Client |
|---|---|---|
| GET | `/bits/list` | `bits.list` |
| GET | `/bits/:id` | `bits.get` |
| GET | `/bits/dashboard` | `bits.dashboard` |
| GET | `/bits/upload-token` | `bits.uploadToken` |
| POST | `/bits/upload` | `bits.upload` |
| POST | `/bits/:id/toggleLike` | `bits.toggleLike` |
| POST | `/bits/:id/save` | `bits.save` |
| POST | `/bits/:id/comments` | `bits.comment` |
| POST | `/bits/:id/share` | `bits.share` |
| POST | `/bits/:id/view` | `bits.view` |

### Notifications & preferences
| Method | Endpoint | Client |
|---|---|---|
| GET | `/notifications` | `notifications.list` |
| PUT | `/notifications/:id/read` | `notifications.markRead` |
| PUT | `/notifications/read-all` | `notifications.markAllRead` |
| DELETE | `/notifications/:id` | `notifications.remove` |
| GET | `/preference` | `preferences.get` |
| GET | `/preference/categories` | `preferences.categories` |
| POST | `/preference/save` | `preferences.save` |
| PUT | `/preference/update` | `preferences.update` |

### Seller payments
| Method | Endpoint | Client |
|---|---|---|
| GET | `/payments/summary` | `payments.summary` |
| GET | `/payments/due` | `payments.due` |
| GET | `/payments/done` | `payments.done` |
| GET | `/payments/adjustments` | `payments.adjustments` |
| GET | `/payments/payout/:payoutId` | `payments.payout` |

### Support & legal
| Method | Endpoint | Client |
|---|---|---|
| GET | `/contact/support` | `content.support` |
| GET | `/terms-and-conditions` | `content.terms` |
| GET | `/privacy-policy` | `content.privacy` |

## ⚪ Excluded (not consumed by the web app)

| Method | Endpoint | Reason |
|---|---|---|
| GET | `/share/product/:id` | Mobile deep-link redirect; web owns its own routes + OG |
| GET | `/share/bits/:id` | Mobile deep-link redirect |
| GET | `/share/live/:channelName` | Mobile deep-link redirect |
| GET | `/share/profile/:userId` | Mobile deep-link redirect |
| GET | `/open` | App-open deep link |
| POST | `/checkout/payment/razorpay/webhook` | Razorpay → backend, server-to-server |
| POST | `/product/clear-expired-top-picks` | Cron / maintenance job |
| POST | `/live/cleanup-inactive-viewers` | Cron / maintenance job |
| POST | `/product/:id/action` | Admin moderation toggle |
| PATCH | `/bits/:id/action` | Admin moderation toggle |
| POST | `/coupons/:id/action` | Admin moderation toggle |
| PATCH | `/live/session/:id/action` | Admin moderation toggle |
| POST | `/category` | Admin — create category |
| PUT | `/category/:id` | Admin — edit category |
| DELETE | `/category/:id` | Admin — delete category |
| POST | `/category/:id/subcategories` | Admin — add subcategory |
| PUT | `/orders/admin/seller/:sellerId/cleared-status` | Admin — settlement status |
| POST | `/bits/upload-v2` | Superseded by `/bits/upload` |
| GET | `/contact/support/api` | Internal support variant |
| GET | `/test` | Dev/health check |
| — | `/admin/*` (35 handlers) | Separate admin app, out of storefront scope |

---

ponytail: coverage is derived from `routes/*` at time of writing. Re-run the
audit if the backend adds routes — one grep over `routes/` gives the new count.
