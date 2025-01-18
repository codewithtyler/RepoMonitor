import { useState, useEffect } from 'react'
import { getAuthState, subscribeToAuth } from '@/lib/auth/global-state'

interface FavoriteRepository {
    owner: string
    name: string
    timestamp: number
}

// Get favorites from local storage
const getFavorites = (): FavoriteRepository[] => {
    try {
        const stored = localStorage.getItem('favorites')
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

// Save favorites to local storage
const saveFavorites = (favorites: FavoriteRepository[]) => {
    try {
        localStorage.setItem('favorites', JSON.stringify(favorites))
    } catch (error) {
        console.error('Error saving favorites:', error)
    }
}

export function useFavorites() {
    const [favorites, setFavorites] = useState<FavoriteRepository[]>(getFavorites)
    const { user } = getAuthState()

    // Clear favorites on logout
    useEffect(() => {
        return subscribeToAuth((state) => {
            if (!state.user) {
                setFavorites([])
                localStorage.removeItem('favorites')
            }
        })
    }, [])

    // Save favorites when they change
    useEffect(() => {
        saveFavorites(favorites)
    }, [favorites])

    const addFavorite = (owner: string, name: string) => {
        setFavorites(prev => {
            const exists = prev.some(fav =>
                fav.owner.toLowerCase() === owner.toLowerCase() &&
                fav.name.toLowerCase() === name.toLowerCase()
            )
            if (exists) return prev
            return [...prev, { owner, name, timestamp: Date.now() }]
        })
    }

    const removeFavorite = (owner: string, name: string) => {
        setFavorites(prev => prev.filter(fav =>
            !(fav.owner.toLowerCase() === owner.toLowerCase() &&
                fav.name.toLowerCase() === name.toLowerCase())
        ))
    }

    const isFavorite = (owner: string, name: string) => {
        return favorites.some(fav =>
            fav.owner.toLowerCase() === owner.toLowerCase() &&
            fav.name.toLowerCase() === name.toLowerCase()
        )
    }

    return {
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite
    }
}
