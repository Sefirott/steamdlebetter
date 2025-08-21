import './styles/reviewContainer.css'
import type { FC, ReactNode } from 'react';

interface ReviewContainerProps {
    reviews: ReactNode[]
    animateLast?: boolean
}

export const ReviewContainer: FC<ReviewContainerProps> = ({reviews, animateLast}) => {
    const lastIndex = reviews.length - 1;
    return (
        <div className="review-container">
            <div className="review-content">
                {reviews.map((item, idx) => {
                    const enterClass = animateLast && idx === lastIndex ? ' review-item-enter' : '';
                    return (
                        <div className={'review-item' + enterClass} key={idx}>
                            {item}
                        </div>
                    );
                })}
            </div>
        </div>
    )
}