import './styles/reviews.css'
import { useMemo, useState} from "react";
import {ReviewContainer} from "./reviewContainer.tsx";
import {useSteamReviews} from "./apiHooks/reviewsHook.tsx";

export const Reviews = () => {
    // Full list of reviews (could be any ReactNode[] in real usage)
    const allReviews = useMemo(() => [1, 2, 3, 4, 5], []);

    // Count how many reviews are currently visible
    const [visibleCount, setVisibleCount] = useState(1);
    // Flag to animate only the newly added item after clicking "Show more"
    const [animateLast, setAnimateLast] = useState(false);

    // Slice the reviews to only show the desired amount
    const visibleReviews = useMemo(() => allReviews.slice(0, visibleCount), [allReviews, visibleCount]);

    const canShowMore = visibleCount < allReviews.length;

    const handleShowMore = () => {
        if (canShowMore) {
            setAnimateLast(true);
            setVisibleCount((c) => Math.min(c + 1, allReviews.length));
        }
    };

        useSteamReviews(730, {
            language: 'english',
            filter: 'recent',
            purchase_type: 'all',
            day_range: 30,
            review_type: 'positive',
            num_per_page: 10,
            include_review: true,
            fetchOnMount: true,
        });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <ReviewContainer reviews={visibleReviews} animateLast={animateLast} />
            {canShowMore && (
                <button onClick={handleShowMore} aria-expanded={animateLast}>
                    Guess
                </button>
            )}
        </div>
    )
}