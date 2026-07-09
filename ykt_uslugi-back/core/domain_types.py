from typing import Literal

ListingType = Literal["offer", "request"]
PriceType = Literal["fixed", "from", "negotiable"]
ServiceStatus = Literal["active", "hidden", "moderation", "closed"]
ServiceSort = Literal["newest", "oldest", "price_asc", "price_desc"]
DealStatus = Literal["new", "accepted", "work_submitted", "revision_requested", "disputed", "completed", "cancelled", "declined"]
DealUpdateStatus = Literal["accepted", "work_submitted", "completed", "revision_requested", "disputed", "cancelled", "declined"]
AdminDealStatus = Literal["completed", "cancelled", "revision_requested"]
ReportTargetType = Literal["service", "user", "review"]
ReportStatus = Literal["new", "reviewed", "resolved", "rejected"]
ReportReason = Literal["spam", "fraud", "abuse", "illegal", "wrong_info", "other"]
ReviewType = Literal["performer", "customer"]
TokenType = Literal["bearer"]
