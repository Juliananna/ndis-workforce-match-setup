import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface Review {
  id: string;
  offerId: string;
  reviewerUserId: string;
  reviewerRole: "EMPLOYER" | "WORKER";
  revieweeUserId: string;
  revieweeRole: "EMPLOYER" | "WORKER";
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface SubmitReviewRequest {
  offerId: string;
  rating: number;
  comment?: string;
}

export const submitReview = api<SubmitReviewRequest, Review>(
  { expose: true, auth: true, method: "POST", path: "/offers/:offerId/review" },
  async (req) => {
    const auth = getAuthData()!;

    if (!Number.isInteger(req.rating) || req.rating < 1 || req.rating > 5) {
      throw APIError.invalidArgument("rating must be an integer between 1 and 5");
    }
    if (req.comment && req.comment.length > 1000) {
      throw APIError.invalidArgument("comment cannot exceed 1000 characters");
    }

    const offer = await db.queryRow<{
      offer_id: string;
      employer_id: string;
      worker_id: string;
      status: string;
    }>`
      SELECT offer_id, employer_id, worker_id, status
      FROM offers
      WHERE offer_id = ${req.offerId}
    `;
    if (!offer) throw APIError.notFound("offer not found");
    if (offer.status !== "Accepted") {
      throw APIError.failedPrecondition("reviews can only be submitted for accepted offers");
    }

    let reviewerUserId: string;
    let revieweeUserId: string;
    let reviewerRole: "EMPLOYER" | "WORKER";
    let revieweeRole: "EMPLOYER" | "WORKER";

    if (auth.role === "EMPLOYER") {
      const employer = await db.queryRow<{ employer_id: string; user_id: string }>`
        SELECT employer_id, user_id FROM employers WHERE user_id = ${auth.userID}
      `;
      if (!employer || employer.employer_id !== offer.employer_id) {
        throw APIError.permissionDenied("not authorized to review this offer");
      }
      const worker = await db.queryRow<{ user_id: string }>`
        SELECT user_id FROM workers WHERE worker_id = ${offer.worker_id}
      `;
      if (!worker) throw APIError.notFound("worker not found");

      reviewerUserId = auth.userID;
      reviewerRole = "EMPLOYER";
      revieweeUserId = worker.user_id;
      revieweeRole = "WORKER";
    } else if (auth.role === "WORKER") {
      const worker = await db.queryRow<{ worker_id: string; user_id: string }>`
        SELECT worker_id, user_id FROM workers WHERE user_id = ${auth.userID}
      `;
      if (!worker || worker.worker_id !== offer.worker_id) {
        throw APIError.permissionDenied("not authorized to review this offer");
      }
      const employer = await db.queryRow<{ user_id: string }>`
        SELECT user_id FROM employers WHERE employer_id = ${offer.employer_id}
      `;
      if (!employer) throw APIError.notFound("employer not found");

      reviewerUserId = auth.userID;
      reviewerRole = "WORKER";
      revieweeUserId = employer.user_id;
      revieweeRole = "EMPLOYER";
    } else {
      throw APIError.permissionDenied("not authorized");
    }

    const row = await db.queryRow<{
      id: string;
      offer_id: string;
      reviewer_user_id: string;
      reviewer_role: string;
      reviewee_user_id: string;
      reviewee_role: string;
      rating: number;
      comment: string | null;
      created_at: Date;
    }>`
      INSERT INTO reviews (
        offer_id, reviewer_user_id, reviewer_role,
        reviewee_user_id, reviewee_role, rating, comment
      ) VALUES (
        ${req.offerId}, ${reviewerUserId}, ${reviewerRole},
        ${revieweeUserId}, ${revieweeRole}, ${req.rating}, ${req.comment ?? null}
      )
      ON CONFLICT (offer_id, reviewer_user_id) DO UPDATE
        SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
      RETURNING id, offer_id, reviewer_user_id, reviewer_role,
                reviewee_user_id, reviewee_role, rating, comment, created_at
    `;

    if (!row) throw APIError.internal("failed to submit review");

    return {
      id: row.id,
      offerId: row.offer_id,
      reviewerUserId: row.reviewer_user_id,
      reviewerRole: row.reviewer_role as Review["reviewerRole"],
      revieweeUserId: row.reviewee_user_id,
      revieweeRole: row.reviewee_role as Review["revieweeRole"],
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
    };
  }
);

export interface GetReviewsRequest {
  userId: string;
}

export interface ReviewSummary {
  averageRating: number | null;
  totalReviews: number;
  reviews: Review[];
}

export const getReviews = api<GetReviewsRequest, ReviewSummary>(
  { expose: true, auth: true, method: "GET", path: "/reviews/:userId" },
  async (req) => {
    const row = await db.queryRow<{ avg_rating: number | null; total: number }>`
      SELECT AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*)::int AS total
      FROM reviews
      WHERE reviewee_user_id = ${req.userId}
    `;

    const rows = await db.queryAll<{
      id: string;
      offer_id: string;
      reviewer_user_id: string;
      reviewer_role: string;
      reviewee_user_id: string;
      reviewee_role: string;
      rating: number;
      comment: string | null;
      created_at: Date;
    }>`
      SELECT id, offer_id, reviewer_user_id, reviewer_role,
             reviewee_user_id, reviewee_role, rating, comment, created_at
      FROM reviews
      WHERE reviewee_user_id = ${req.userId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return {
      averageRating: row?.avg_rating ? Number(row.avg_rating) : null,
      totalReviews: row?.total ?? 0,
      reviews: rows.map((r) => ({
        id: r.id,
        offerId: r.offer_id,
        reviewerUserId: r.reviewer_user_id,
        reviewerRole: r.reviewer_role as Review["reviewerRole"],
        revieweeUserId: r.reviewee_user_id,
        revieweeRole: r.reviewee_role as Review["revieweeRole"],
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
      })),
    };
  }
);

export interface GetMyReviewForOfferRequest {
  offerId: string;
}

export const getMyReviewForOffer = api<GetMyReviewForOfferRequest, { review: Review | null }>(
  { expose: true, auth: true, method: "GET", path: "/offers/:offerId/review" },
  async (req) => {
    const auth = getAuthData()!;

    const row = await db.queryRow<{
      id: string;
      offer_id: string;
      reviewer_user_id: string;
      reviewer_role: string;
      reviewee_user_id: string;
      reviewee_role: string;
      rating: number;
      comment: string | null;
      created_at: Date;
    }>`
      SELECT id, offer_id, reviewer_user_id, reviewer_role,
             reviewee_user_id, reviewee_role, rating, comment, created_at
      FROM reviews
      WHERE offer_id = ${req.offerId} AND reviewer_user_id = ${auth.userID}
    `;

    if (!row) return { review: null };

    return {
      review: {
        id: row.id,
        offerId: row.offer_id,
        reviewerUserId: row.reviewer_user_id,
        reviewerRole: row.reviewer_role as Review["reviewerRole"],
        revieweeUserId: row.reviewee_user_id,
        revieweeRole: row.reviewee_role as Review["revieweeRole"],
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
      },
    };
  }
);
