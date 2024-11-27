import { Client, TravelMode, PlaceInputType } from "@googlemaps/google-maps-services-js";

export class MapsService {
  private client: Client;

  constructor(private apiKey: string) {
    this.client = new Client({});
  }

  async getDirections(
    origin: string,
    destination: string,
    mode: "driving" | "walking"
  ) {
    try {
      const response = await this.client.directions({
        params: {
          origin,
          destination,
          mode: mode === "driving" ? TravelMode.driving : TravelMode.walking,
          key: this.apiKey,
        },
      });

      return this.extractImportantInfo(response.data);
    } catch (error) {
      console.error("Error fetching directions:", error);
      throw error;
    }
  }

  async findPlaceFromText(query: string) {
    try {
      const response = await this.client.findPlaceFromText({
        params: {
          input: query,
          inputtype: PlaceInputType.textQuery,
          fields: ["name", "formatted_address", "geometry", "place_id"],
          key: this.apiKey,
        },
      });

      return response.data.candidates;
    } catch (error) {
      console.error("Error finding place from text:", error);
      throw error;
    }
  }

  async getPlaceDetails(placeId: string) {
    try {
      const response = await this.client.placeDetails({
        params: {
          place_id: placeId,
          fields: [
            "name",
            "formatted_address",
            "geometry",
            "place_id",
            "rating",
            "user_ratings_total",
            "formatted_phone_number",
            "website",
            "opening_hours",
            "price_level",
            "types",
            "reviews",
          ],
          key: this.apiKey,
        },
      });

      return this.extractPlaceDetails(response.data.result);
    } catch (error) {
      console.error("Error fetching place details:", error);
      throw error;
    }
  }

  private extractImportantInfo(data: any) {
    if (!data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const leg = route.legs[0];

    return {
      distance: leg.distance.text,
      duration: leg.duration.text,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      steps: leg.steps.map((step: any) => ({
        distance: step.distance.text,
        duration: step.duration.text,
        instructions: step.html_instructions,
      })),
      summary: route.summary,
      warnings: route.warnings,
    };
  }

  private extractPlaceDetails(place: any) {
    return {
      name: place.name,
      address: place.formatted_address,
      location: place.geometry?.location,
      placeId: place.place_id,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      phoneNumber: place.formatted_phone_number,
      website: place.website,
      openingHours: place.opening_hours?.weekday_text,
      priceLevel: place.price_level,
      types: place.types,
      reviews: place.reviews?.map((review: any) => ({
        author: review.author_name,
        rating: review.rating,
        text: review.text,
        time: new Date(review.time * 1000).toISOString(),
      })),
    };
  }
}
