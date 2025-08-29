import { supabase, Location } from '../lib/supabase';

export class LocationService {
  static async getAllLocations(): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get locations error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get locations error:', error);
      return [];
    }
  }

  static async getActiveLocations(): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('locationname', { ascending: true });

      if (error) {
        console.error('Get active locations error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get active locations error:', error);
      return [];
    }
  }

  static async getLocationById(id: string): Promise<Location | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Get location by id error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get location by id error:', error);
      return null;
    }
  }

  static async getGoodsAtLocation(locationId: string): Promise<Array<{ idgood: string; good_code: string; good_name: string; categoryname: string; total_stock: number }>> {
    try {
      // Get goods at location using location_stocks table with proper join
      const { data, error } = await supabase
        .from('location_stocks')
        .select(`
          idgood,
          stock,
          goods!inner(
            id,
            code,
            name,
            idcategory,
            categories!inner(
              categoryname
            )
          )
        `)
        .eq('idlocation', locationId);

      if (error) {
        console.error('Get goods at location error:', error);
        return [];
      }

      console.log('Raw query result:', data);

      const mapped = (data || []).map((row: any) => ({
        idgood: row.idgood,
        good_code: row.goods?.code || '',
        good_name: row.goods?.name || '',
        categoryname: row.goods?.categories?.categoryname || '',
        total_stock: row.stock || 0
      }));
      
      console.log('Mapped result:', mapped);
      
      // Sort by good name in ascending order
      return mapped.sort((a, b) => a.good_name.localeCompare(b.good_name));
    } catch (error) {
      console.error('Get goods at location error:', error);
      return [];
    }
  }

  static async createLocation(locationData: {
    locationname: string;
    locationaddress?: string;
  }): Promise<Location | null> {
    try {
      const payload: any = {
        locationname: locationData.locationname,
        address: locationData.locationaddress || null
      };
      const { data, error } = await supabase
        .from('locations')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Create location error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Create location error:', error);
      return null;
    }
  }

  static async updateLocation(id: string, locationData: Partial<Location>): Promise<Location | null> {
    try {
      const updates: any = { ...locationData } as any;
      if ((updates as any).locationaddress !== undefined) {
        updates.address = (updates as any).locationaddress;
        delete (updates as any).locationaddress;
      }
      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update location error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Update location error:', error);
      return null;
    }
  }

  static async deleteLocation(id: string): Promise<boolean> {
    try {
      // Guard: block delete if any goods exist at this location
      const { count } = await supabase
        .from('location_stocks')
        .select('id', { count: 'exact', head: true })
        .eq('idlocation', id);
      if ((count || 0) > 0) {
        console.error('Delete location blocked: referenced by location_stocks');
        return false;
      }
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete location error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete location error:', error);
      return false;
    }
  }
}