-- Migration for adding physical prize tracking

-- Add descriptive string for the prize
ALTER TABLE public.contests ADD COLUMN prize_description text;

-- Add fulfillment tracking to winners
ALTER TABLE public.contest_winners ADD COLUMN fulfillment_status text DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered', 'emailed'));
ALTER TABLE public.contest_winners ADD COLUMN fulfillment_notes text;

-- Add shipping address storage to profiles
ALTER TABLE public.profiles ADD COLUMN shipping_address text;
