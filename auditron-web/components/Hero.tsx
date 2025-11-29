'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface HeroProps {
    title: string
    subtitle: string
    ctaText?: string
    ctaLink?: string
    waveAsset?: string
}

export function Hero({
    title,
    subtitle,
    ctaText = 'Join now',
    ctaLink = '#features',
    waveAsset = '/assets/wave.png',
}: HeroProps) {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Background gradient */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    background: 'linear-gradient(180deg, rgba(13,11,10,1) 10%, rgba(20,12,16,1) 80%)',
                }}
                aria-hidden="true"
            />

            {/* Wave overlay */}
            <div
                className="absolute inset-0 z-10 opacity-60 mix-blend-screen pointer-events-none"
                style={{
                    backgroundImage: `url(${waveAsset})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundRepeat: 'no-repeat',
                }}
                aria-hidden="true"
            />

            {/* Content */}
            <div className="container mx-auto px-6 relative z-20">
                <motion.div
                    className="max-w-4xl mx-auto text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    <h1 className="text-5xl md:text-7xl font-light leading-tight mb-6">
                        {title}
                    </h1>

                    <motion.p
                        className="text-xl md:text-2xl text-text-gray mb-10 max-w-2xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        {subtitle}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <Link
                            href={ctaLink}
                            className="btn btn-primary text-lg px-10 py-4 inline-block gold-glow"
                            aria-label={ctaText}
                        >
                            {ctaText}
                        </Link>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 1,
                    delay: 1,
                    repeat: Infinity,
                    repeatType: 'reverse',
                }}
            >
                <div className="w-6 h-10 border-2 border-accent-gold rounded-full flex justify-center pt-2">
                    <div className="w-1 h-3 bg-accent-gold rounded-full" />
                </div>
            </motion.div>
        </section>
    )
}
