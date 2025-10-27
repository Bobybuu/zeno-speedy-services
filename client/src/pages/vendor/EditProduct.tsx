// src/pages/vendor/EditProduct.tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gasProductsAPI } from '@/services/vendorService';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Package, 
  Save, 
  ArrowLeft,
  DollarSign,
  PackageOpen,
  AlertTriangle,
  Upload,
  Eye,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const EditProduct = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    gas_type: 'lpg',
    cylinder_size: '6kg',
    brand: '',
    price_with_cylinder: '',
    price_without_cylinder: '',
    stock_quantity: '',
    min_stock_alert: '5',
    description: '',
    ingredients: '',
    safety_instructions: '',
    is_active: true,
    featured: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch product data
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await gasProductsAPI.getGasProduct(parseInt(productId));
      return response; // ✅ REMOVED .data - response is already the data
    },
    enabled: !!productId,
  });

  const gasTypes = [
    { value: 'lpg', label: 'LPG (Liquefied Petroleum Gas)' },
    { value: 'cng', label: 'CNG (Compressed Natural Gas)' },
    { value: 'propane', label: 'Propane' },
    { value: 'butane', label: 'Butane' },
  ];

  const cylinderSizes = [
    { value: '3kg', label: '3 kg' },
    { value: '6kg', label: '6 kg' },
    { value: '12kg', label: '12 kg' },
    { value: '15kg', label: '15 kg' },
    { value: '25kg', label: '25 kg' },
    { value: '50kg', label: '50 kg' },
  ];

  // Populate form when product data is loaded
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        gas_type: product.gas_type || 'lpg',
        cylinder_size: product.cylinder_size || '6kg',
        brand: product.brand || '',
        price_with_cylinder: product.price_with_cylinder?.toString() || '',
        price_without_cylinder: product.price_without_cylinder?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        min_stock_alert: product.min_stock_alert?.toString() || '5',
        description: product.description || '',
        ingredients: product.ingredients || '',
        safety_instructions: product.safety_instructions || '',
        is_active: product.is_active ?? true,
        featured: product.featured || false,
      });
    }
  }, [product]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.price_with_cylinder || parseFloat(formData.price_with_cylinder) <= 0) {
      newErrors.price_with_cylinder = 'Valid price with cylinder is required';
    }

    if (!formData.price_without_cylinder || parseFloat(formData.price_without_cylinder) <= 0) {
      newErrors.price_without_cylinder = 'Valid price without cylinder is required';
    }

    if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) {
      newErrors.stock_quantity = 'Valid stock quantity is required';
    }

    if (parseFloat(formData.price_with_cylinder) <= parseFloat(formData.price_without_cylinder)) {
      newErrors.price_with_cylinder = 'Price with cylinder must be greater than price without cylinder';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateProductMutation = useMutation({
    mutationFn: (data: any) => {
      if (!productId) throw new Error('Product ID is required');
      return gasProductsAPI.updateGasProduct(parseInt(productId), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Product updated successfully!');
      navigate('/vendor/products');
    },
    onError: (error: any) => {
      console.error('Product update error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update product';
      toast.error(errorMessage);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: () => {
      if (!productId) throw new Error('Product ID is required');
      return gasProductsAPI.toggleAvailability(parseInt(productId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Product availability updated!');
    },
    onError: () => {
      toast.error('Failed to update product availability');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setIsSubmitting(true);

    const submitData = {
      ...formData,
      price_with_cylinder: parseFloat(formData.price_with_cylinder),
      price_without_cylinder: parseFloat(formData.price_without_cylinder),
      stock_quantity: parseInt(formData.stock_quantity),
      min_stock_alert: parseInt(formData.min_stock_alert),
    };

    updateProductMutation.mutate(submitData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNumberInput = (field: string, value: string) => {
    // Allow only numbers and decimal points
    const numericValue = value.replace(/[^\d.]/g, '');
    handleInputChange(field, numericValue);
  };

  const handleToggleAvailability = () => {
    toggleAvailabilityMutation.mutate();
  };

  const getStockStatus = () => {
    if (!product) return null;
    
    if (product.stock_quantity === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const };
    }
    if (product.low_stock) {
      return { label: 'Low Stock', variant: 'secondary' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Skeleton */}
          <div className="lg:col-span-2">
            <Skeleton className="h-[600px] rounded-lg" />
          </div>
          
          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/vendor/products')}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Not Found</h1>
              <p className="text-muted-foreground mt-2">
                The product you're looking for doesn't exist
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Product Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The product you're trying to edit doesn't exist or you don't have permission to access it.
            </p>
            <Button onClick={() => navigate('/vendor/products')}>
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/vendor/products')}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-muted-foreground mt-2">
              Update your product information and inventory
            </p>
          </div>
        </div>
        
        {product && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleToggleAvailability}
              disabled={toggleAvailabilityMutation.isPending}
            >
              {product.is_active ? 'Deactivate' : 'Activate'} Product
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/vendor/products`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View All Products
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Product Information
              </CardTitle>
              <CardDescription>
                Update the details for your gas product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g., Premium Cooking Gas"
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => handleInputChange('brand', e.target.value)}
                        placeholder="e.g., Total, Shell, etc."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gas_type">Gas Type *</Label>
                      <select
                        id="gas_type"
                        value={formData.gas_type}
                        onChange={(e) => handleInputChange('gas_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                      >
                        {gasTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cylinder_size">Cylinder Size *</Label>
                      <select
                        id="cylinder_size"
                        value={formData.cylinder_size}
                        onChange={(e) => handleInputChange('cylinder_size', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary"
                      >
                        {cylinderSizes.map((size) => (
                          <option key={size.value} value={size.value}>
                            {size.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Product Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe your product features and benefits..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pricing</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price_with_cylinder">Price with Cylinder (KES) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="price_with_cylinder"
                          type="text"
                          value={formData.price_with_cylinder}
                          onChange={(e) => handleNumberInput('price_with_cylinder', e.target.value)}
                          placeholder="0.00"
                          className="pl-10"
                        />
                      </div>
                      {errors.price_with_cylinder && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.price_with_cylinder}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price_without_cylinder">Price without Cylinder (KES) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="price_without_cylinder"
                          type="text"
                          value={formData.price_without_cylinder}
                          onChange={(e) => handleNumberInput('price_without_cylinder', e.target.value)}
                          placeholder="0.00"
                          className="pl-10"
                        />
                      </div>
                      {errors.price_without_cylinder && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.price_without_cylinder}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inventory */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Inventory</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                      {errors.stock_quantity && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.stock_quantity}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min_stock_alert">Low Stock Alert Level</Label>
                      <Input
                        id="min_stock_alert"
                        type="number"
                        value={formData.min_stock_alert}
                        onChange={(e) => handleInputChange('min_stock_alert', e.target.value)}
                        placeholder="5"
                        min="1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Get notified when stock falls below this level
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ingredients">Ingredients/Composition</Label>
                    <Textarea
                      id="ingredients"
                      value={formData.ingredients}
                      onChange={(e) => handleInputChange('ingredients', e.target.value)}
                      placeholder="List the gas composition and any additives..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="safety_instructions">Safety Instructions</Label>
                    <Textarea
                      id="safety_instructions"
                      value={formData.safety_instructions}
                      onChange={(e) => handleInputChange('safety_instructions', e.target.value)}
                      placeholder="Important safety information for customers..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={formData.featured}
                      onChange={(e) => handleInputChange('featured', e.target.checked)}
                      className="rounded border-gray-300 text-secondary focus:ring-secondary"
                    />
                    <Label htmlFor="featured" className="font-normal">
                      Feature this product
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      className="rounded border-gray-300 text-secondary focus:ring-secondary"
                    />
                    <Label htmlFor="is_active" className="font-normal">
                      Product is active and visible to customers
                    </Label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/vendor/products')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Updating Product...' : 'Update Product'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageOpen className="h-5 w-5" />
                Product Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                {formData.name ? (
                  <div className="text-center p-4">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="font-semibold text-sm">{formData.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {formData.gas_type} • {formData.cylinder_size}
                    </p>
                    {formData.brand && (
                      <p className="text-xs text-muted-foreground mt-1">{formData.brand}</p>
                    )}
                    {stockStatus && (
                      <Badge variant={stockStatus.variant} className="mt-2">
                        {stockStatus.label}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Product preview</p>
                  </div>
                )}
              </div>

              {formData.price_with_cylinder && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>With Cylinder:</span>
                    <span className="font-semibold">
                      KES {parseFloat(formData.price_with_cylinder || '0').toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Without Cylinder:</span>
                    <span className="font-semibold">
                      KES {parseFloat(formData.price_without_cylinder || '0').toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {product && (
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Product ID</p>
                      <p className="text-muted-foreground">#{product.id}</p>
                    </div>
                    <div>
                      <p className="font-medium">Status</p>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium">Created</p>
                      <p className="text-muted-foreground">
                        {new Date(product.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p className="text-muted-foreground">
                        {new Date(product.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleToggleAvailability}
                disabled={toggleAvailabilityMutation.isPending}
              >
                {product?.is_active ? 'Deactivate Product' : 'Activate Product'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/vendor/products')}
              >
                View All Products
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Editing Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p>Price changes will affect all future orders</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p>Update stock levels regularly to avoid overselling</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p>Deactivating hides the product from customers</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditProduct;